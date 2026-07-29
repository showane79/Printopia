/**
 * Printopia Worker entry.
 *
 * Serves the built SPA from static assets and exposes a secure admin auth API
 * at /api/admin/*. The admin password hash and an auto-generated session
 * signing secret are stored in D1 — the owner NEVER creates ADMIN_PASSWORD_HASH
 * or SESSION_SECRET manually.
 *
 * IMPORTANT (root cause of "database not connected"):
 * This Worker deploys from GitHub, so wrangler.jsonc is the single source of
 * truth. A D1 binding added only in the Cloudflare dashboard is OVERWRITTEN on
 * the next Git deploy. The binding must be declared in wrangler.jsonc with the
 * REAL database_id (a fake/placeholder id fails deploy with code 10021).
 *
 * IMPORTANT (root cause of "خطایی رخ داد" on admin creation):
 * Cloudflare Workers' crypto.subtle caps PBKDF2 iterations (~100,000). Higher
 * counts make deriveBits() THROW. We use 100,000 iterations, which is within
 * the runtime limit and still secure for an admin account.
 */

// ---- Minimal runtime types (no extra deps) -------------------------------
type DbState = "binding_missing" | "unreachable" | "ready";

interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement;
  all(): Promise<{ results: unknown[] }>;
  first<T = Record<string, unknown>>(): Promise<T | null>;
  run(): Promise<{ meta: unknown }>;
}
interface D1Database {
  prepare(query: string): D1PreparedStatement;
}
interface AssetsBinding {
  fetch(request: Request): Promise<Response>;
}
interface Env {
  DB?: D1Database;
  ASSETS: AssetsBinding;
}

// Shared password policy (must match the client wizard).
const MIN_PASSWORD_LENGTH = 8;
// Cloudflare Workers crypto.subtle allows up to ~100,000 PBKDF2 iterations.
const PBKDF2_ITERATIONS = 100_000;

// Structured, non-sensitive error codes.
type SetupErrorCode =
  | "INVALID_PASSWORD_POLICY"
  | "PASSWORD_MISMATCH"
  | "DB_NOT_READY"
  | "ADMIN_ALREADY_EXISTS"
  | "HASHING_FAILED"
  | "DB_INSERT_FAILED"
  | "SESSION_INIT_FAILED"
  | "RATE_LIMITED"
  | "UNKNOWN_ERROR";

// ---- JSON / response helpers ---------------------------------------------
function json(data: unknown, init: { status?: number; headers?: Record<string, string> } = {}) {
  return new Response(JSON.stringify(data), {
    status: init.status ?? 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "no-referrer",
      ...(init.headers ?? {}),
    },
  });
}
function fail(code: SetupErrorCode, message: string, status: number, extra?: Record<string, unknown>) {
  return json({ ok: false, code, message, ...(extra ?? {}) }, { status });
}

// ---- Crypto: PBKDF2 password hashing (server-side) -----------------------
const enc = new TextEncoder();

function toHex(buf: ArrayBuffer): string {
  let out = "";
  const bytes = new Uint8Array(buf);
  for (const b of bytes) out += b.toString(16).padStart(2, "0");
  return out;
}
function bytesToB64(bytes: Uint8Array): string {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s);
}
function randomHex(byteLen: number): string {
  return toHex(crypto.getRandomValues(new Uint8Array(byteLen)).buffer as ArrayBuffer);
}

async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey("raw", enc.encode(password), { name: "PBKDF2" }, false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt, iterations: PBKDF2_ITERATIONS, hash: "SHA-256" },
    key,
    256
  );
  return `${bytesToB64(salt)}:${toHex(bits)}`;
}
async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [saltB64, expected] = stored.split(":");
  if (!saltB64 || !expected) return false;
  const salt = Uint8Array.from(atob(saltB64), (c) => c.charCodeAt(0));
  const key = await crypto.subtle.importKey("raw", enc.encode(password), { name: "PBKDF2" }, false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt, iterations: PBKDF2_ITERATIONS, hash: "SHA-256" },
    key,
    256
  );
  const computed = toHex(bits);
  if (computed.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= computed.charCodeAt(i) ^ expected.charCodeAt(i);
  return diff === 0;
}

// ---- HMAC session signing (secret lives in D1) ---------------------------
async function hmac(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(message));
  return toHex(sig);
}

const SESSION_COOKIE = "printopia_admin";
const SESSION_TTL_SEC = 60 * 60 * 12;

async function createSessionValue(secret: string): Promise<string> {
  const exp = Date.now() + SESSION_TTL_SEC * 1000;
  const payload = `admin.${exp}`;
  const sig = await hmac(secret, payload);
  return `${payload}.${sig}`;
}
async function verifySessionValue(secret: string, value: string | null): Promise<boolean> {
  if (!value) return false;
  const parts = value.split(".");
  if (parts.length !== 3) return false;
  const payload = `${parts[0]}.${parts[1]}`;
  const exp = Number(parts[1]);
  const sig = parts[2];
  if (!Number.isFinite(exp) || exp < Date.now()) return false;
  const expected = await hmac(secret, payload);
  if (expected.length !== sig.length) return false;
  let diff = 0;
  for (let i = 0; i < sig.length; i++) diff |= expected.charCodeAt(i) ^ sig.charCodeAt(i);
  return diff === 0;
}
function sessionCookieHeader(value: string, maxAge: number): string {
  return `${SESSION_COOKIE}=${value}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${maxAge}`;
}
function clearSessionCookieHeader(): string {
  return `${SESSION_COOKIE}=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0`;
}
function readCookie(request: Request, name: string): string | null {
  const raw = request.headers.get("Cookie") ?? "";
  const match = raw.match(new RegExp(`(?:^|;\\s*)${name}=([^;]+)`));
  return match ? match[1] : null;
}

// ---- D1 helpers -----------------------------------------------------------
async function ensureSchema(env: Env): Promise<void> {
  if (!env.DB) return;
  await env.DB.prepare("CREATE TABLE IF NOT EXISTS app_config (key TEXT PRIMARY KEY, value TEXT NOT NULL);").run();
  await env.DB.prepare("CREATE TABLE IF NOT EXISTS admin (id INTEGER PRIMARY KEY, password_hash TEXT NOT NULL, created_at TEXT NOT NULL);").run();
}
async function getConfig(env: Env, key: string): Promise<string | null> {
  if (!env.DB) return null;
  const row = await env.DB.prepare("SELECT value FROM app_config WHERE key = ?").bind(key).first<{ value: string }>();
  return row?.value ?? null;
}
async function setConfig(env: Env, key: string, value: string): Promise<void> {
  if (!env.DB) return;
  await env.DB.prepare("INSERT INTO app_config (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value;").bind(key, value).run();
}
async function getAdminHash(env: Env): Promise<string | null> {
  if (!env.DB) return null;
  const row = await env.DB.prepare("SELECT password_hash FROM admin WHERE id = 1").first<{ password_hash: string }>();
  return row?.password_hash ?? null;
}
/** Returns the existing session secret, or creates+stores a new one. */
async function ensureSessionSecret(env: Env): Promise<string> {
  const existing = await getConfig(env, "session_secret");
  if (existing) return existing;
  const secret = randomHex(32);
  await setConfig(env, "session_secret", secret);
  return secret;
}

/** Reusable database resolver/guard. Runs a harmless health query and idempotent
 *  migrations. Logs safe diagnostics server-side only; never exposes to visitors. */
async function resolveDb(env: Env): Promise<DbState> {
  if (!env.DB) return "binding_missing";
  try {
    await env.DB.prepare("SELECT 1").first();
    await ensureSchema(env); // idempotent: creates tables only if absent
    return "ready";
  } catch (e) {
    console.error("[printopia] D1 health/migration failed:", (e as Error)?.name ?? "unknown");
    return "unreachable";
  }
}

// ---- Rate limit (per-isolate, best-effort) -------------------------------
const attempts = new Map<string, { count: number; first: number }>();
function rateLimit(key: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  const rec = attempts.get(key);
  if (!rec || now - rec.first > windowMs) {
    attempts.set(key, { count: 1, first: now });
    return true;
  }
  rec.count += 1;
  return rec.count <= max;
}

// ---- API router -----------------------------------------------------------
async function handleApi(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const path = url.pathname.replace(/\/$/, "");

  if (request.method !== "GET" && request.headers.get("Content-Type") !== "application/json") {
    return fail("UNKNOWN_ERROR", "درخواست نامعتبر است.", 415);
  }

  try {
    // STATUS — non-sensitive health + setup/auth state (granular db state).
    if (path === "/api/admin/status" && request.method === "GET") {
      const dbState = await resolveDb(env);
      const setupComplete = dbState === "ready" ? (await getAdminHash(env)) !== null : false;
      let authed = false;
      if (setupComplete) {
        const secret = await getConfig(env, "session_secret");
        if (secret) authed = await verifySessionValue(secret, readCookie(request, SESSION_COOKIE));
      }
      return json({ ok: true, dbState, setupComplete, authed });
    }

    // SETUP — first-run admin creation. Structured, idempotent, partial-state safe.
    if (path === "/api/admin/setup" && request.method === "POST") {
      const dbState = await resolveDb(env);
      if (dbState !== "ready") {
        return fail(
          "DB_NOT_READY",
          dbState === "binding_missing"
            ? "اتصال پایگاه‌داده به نسخهٔ فعال سایت هنوز ثبت نشده است."
            : "پایگاه‌داده در دسترس نیست.",
          503,
          { dbState }
        );
      }
      const ip = request.headers.get("CF-Connecting-IP") ?? "unknown";
      if (!rateLimit(`setup:${ip}`, 10, 60_000)) {
        return fail("RATE_LIMITED", "تلاش‌های زیادی؛ کمی بعد دوباره امتحان کنید.", 429);
      }

      const body = (await request.json().catch(() => ({}))) as { password?: string; confirm?: string };
      const password = String(body.password ?? "");
      const confirm = String(body.confirm ?? "");
      if (password.length < MIN_PASSWORD_LENGTH) {
        return fail("INVALID_PASSWORD_POLICY", `رمز عبور باید حداقل ${MIN_PASSWORD_LENGTH} نویسه باشد.`, 400);
      }
      if (password !== confirm) {
        return fail("PASSWORD_MISMATCH", "رمز عبور و تکرار آن یکسان نیستند.", 400);
      }

      // Admin already exists → self-heal the session secret, then report done.
      if ((await getAdminHash(env)) !== null) {
        await ensureSessionSecret(env).catch(() => {});
        return fail("ADMIN_ALREADY_EXISTS", "حساب مدیر قبلاً ساخته شده است.", 409);
      }

      // Ensure the signing secret exists BEFORE creating the admin row, so a
      // later failure cannot leave an admin without a usable session secret.
      let secret: string;
      try {
        secret = await ensureSessionSecret(env);
      } catch (e) {
        console.error("[printopia] ensureSessionSecret failed:", (e as Error)?.name ?? "unknown");
        return fail("SESSION_INIT_FAILED", "راه‌اندازی نشست ناموفق بود؛ دوباره تلاش کنید.", 500);
      }

      // Hash the password (Workers-compatible PBKDF2).
      let hash: string;
      try {
        hash = await hashPassword(password);
      } catch (e) {
        console.error("[printopia] hashPassword failed:", (e as Error)?.name ?? "unknown");
        return fail("HASHING_FAILED", "خطا در پردازشِ امنِ رمز؛ دوباره تلاش کنید.", 500);
      }

      // Upsert admin (idempotent; recovers any partial/conflicting row safely).
      const now = new Date().toISOString();
      try {
        await env.DB!.prepare(
          "INSERT INTO admin (id, password_hash, created_at) VALUES (1, ?, ?) ON CONFLICT(id) DO UPDATE SET password_hash = excluded.password_hash, created_at = excluded.created_at;"
        )
          .bind(hash, now)
          .run();
      } catch (e) {
        console.error("[printopia] admin upsert failed:", (e as Error)?.name ?? "unknown");
        return fail("DB_INSERT_FAILED", "ذخیره‌سازی ناموفق بود؛ دوباره تلاش کنید.", 500);
      }

      // Issue the session cookie.
      let session: string;
      try {
        session = await createSessionValue(secret);
      } catch (e) {
        console.error("[printopia] createSession failed:", (e as Error)?.name ?? "unknown");
        return fail("SESSION_INIT_FAILED", "راه‌اندازی نشست ناموفق بود؛ دوباره تلاش کنید.", 500);
      }

      return json({ ok: true }, { headers: { "Set-Cookie": sessionCookieHeader(session, SESSION_TTL_SEC) } });
    }

    // LOGIN
    if (path === "/api/admin/login" && request.method === "POST") {
      const dbState = await resolveDb(env);
      if (dbState !== "ready") {
        return fail("DB_NOT_READY", "پایگاه‌داده در دسترس نیست.", 503, { dbState });
      }
      if ((await getAdminHash(env)) === null) {
        return fail("ADMIN_ALREADY_EXISTS", "راه‌اندازی هنوز کامل نشده است.", 409, { needSetup: true });
      }
      const ip = request.headers.get("CF-Connecting-IP") ?? "unknown";
      if (!rateLimit(`login:${ip}`, 8, 60_000)) {
        return fail("RATE_LIMITED", "تلاش‌های زیادی؛ کمی بعد دوباره امتحان کنید.", 429);
      }
      const body = (await request.json().catch(() => ({}))) as { password?: string };
      const password = String(body.password ?? "");
      const stored = await getAdminHash(env);
      if (!stored || !(await verifyPassword(password, stored))) {
        return fail("PASSWORD_MISMATCH", "رمز عبور نادرست است.", 401);
      }
      const secret = await ensureSessionSecret(env);
      const session = await createSessionValue(secret);
      return json({ ok: true }, { headers: { "Set-Cookie": sessionCookieHeader(session, SESSION_TTL_SEC) } });
    }

    // LOGOUT
    if (path === "/api/admin/logout" && request.method === "POST") {
      return json({ ok: true }, { headers: { "Set-Cookie": clearSessionCookieHeader() } });
    }

    return fail("UNKNOWN_ERROR", "پیدا نشد.", 404);
  } catch (e) {
    console.error("[printopia] unhandled api error:", (e as Error)?.name ?? "unknown");
    return fail("UNKNOWN_ERROR", "خطایی رخ داد. دوباره تلاش کنید.", 500);
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname.startsWith("/api/")) {
      return handleApi(request, env);
    }
    return env.ASSETS.fetch(request);
  },
};
