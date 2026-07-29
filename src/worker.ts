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
 * REAL database_id (a D1 binding with a fake/placeholder id fails with code
 * 10021). Until then, env.DB is undefined at runtime and the setup wizard
 * guides the owner through the one correct fix.
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
  const key = await crypto.subtle.importKey("raw", enc.encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt, iterations: 150_000, hash: "SHA-256" },
    key,
    256
  );
  return `${bytesToB64(salt)}:${toHex(bits)}`;
}
async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [saltB64, expected] = stored.split(":");
  if (!saltB64 || !expected) return false;
  const salt = Uint8Array.from(atob(saltB64), (c) => c.charCodeAt(0));
  const key = await crypto.subtle.importKey("raw", enc.encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt, iterations: 150_000, hash: "SHA-256" },
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

/**
 * Single reusable database resolver/guard. Returns a structured, non-sensitive
 * internal state. Never reads D1 from the browser. Runs a harmless health
 * query and idempotent migrations. Logs safe diagnostics server-side only.
 */
async function resolveDb(env: Env): Promise<DbState> {
  if (!env.DB) return "binding_missing";
  try {
    await env.DB.prepare("SELECT 1").first();
    await ensureSchema(env); // idempotent: creates tables only if absent
    return "ready";
  } catch (e) {
    // Server-side diagnostic only; never expose to visitors.
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
    return json({ message: "درخواست نامعتبر است." }, { status: 415 });
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

    // SETUP — first-run admin creation. Idempotent: refuses once an admin exists.
    if (path === "/api/admin/setup" && request.method === "POST") {
      const dbState = await resolveDb(env);
      if (dbState !== "ready") {
        return json(
          {
            message:
              dbState === "binding_missing"
                ? "اتصال پایگاه‌داده به نسخهٔ فعال سایت هنوز ثبت نشده است."
                : "پایگاه‌داده در دسترس نیست.",
            dbState,
          },
          { status: 503 }
        );
      }
      const ip = request.headers.get("CF-Connecting-IP") ?? "unknown";
      if (!rateLimit(`setup:${ip}`, 10, 60_000)) {
        return json({ message: "تلاش‌های زیادی؛ کمی بعد دوباره امتحان کنید." }, { status: 429 });
      }
      if ((await getAdminHash(env)) !== null) {
        return json({ message: "راه‌اندازی قبلاً انجام شده است." }, { status: 409 });
      }
      const body = (await request.json().catch(() => ({}))) as { password?: string; confirm?: string };
      const password = String(body.password ?? "");
      const confirm = String(body.confirm ?? "");
      if (password.length < 8) return json({ message: "رمز باید حداقل ۸ نویسه باشد." }, { status: 400 });
      if (password !== confirm) return json({ message: "رمز و تکرار آن یکسان نیستند." }, { status: 400 });

      const hash = await hashPassword(password);
      const now = new Date().toISOString();
      await env.DB!.prepare("INSERT INTO admin (id, password_hash, created_at) VALUES (1, ?, ?)").bind(hash, now).run();
      const secret = randomHex(32);
      await setConfig(env, "session_secret", secret);

      const session = await createSessionValue(secret);
      return json({ ok: true }, { headers: { "Set-Cookie": sessionCookieHeader(session, SESSION_TTL_SEC) } });
    }

    // LOGIN
    if (path === "/api/admin/login" && request.method === "POST") {
      const dbState = await resolveDb(env);
      if (dbState !== "ready") {
        return json({ message: "پایگاه‌داده در دسترس نیست.", dbState }, { status: 503 });
      }
      if ((await getAdminHash(env)) === null) {
        return json({ message: "راه‌اندازی هنوز کامل نشده است.", needSetup: true }, { status: 409 });
      }
      const ip = request.headers.get("CF-Connecting-IP") ?? "unknown";
      if (!rateLimit(`login:${ip}`, 8, 60_000)) {
        return json({ message: "تلاش‌های زیادی؛ کمی بعد دوباره امتحان کنید." }, { status: 429 });
      }
      const body = (await request.json().catch(() => ({}))) as { password?: string };
      const password = String(body.password ?? "");
      const stored = await getAdminHash(env);
      if (!stored || !(await verifyPassword(password, stored))) {
        return json({ message: "رمز عبور نادرست است." }, { status: 401 });
      }
      const secret = await getConfig(env, "session_secret");
      if (!secret) return json({ message: "خطای پیکربندی نشست." }, { status: 500 });
      const session = await createSessionValue(secret);
      return json({ ok: true }, { headers: { "Set-Cookie": sessionCookieHeader(session, SESSION_TTL_SEC) } });
    }

    // LOGOUT
    if (path === "/api/admin/logout" && request.method === "POST") {
      return json({ ok: true }, { headers: { "Set-Cookie": clearSessionCookieHeader() } });
    }

    return json({ message: "پیدا نشد." }, { status: 404 });
  } catch {
    return json({ message: "خطایی رخ داد. دوباره تلاش کنید." }, { status: 500 });
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
