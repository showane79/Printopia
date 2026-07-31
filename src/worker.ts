/**
 * Printopia Worker — serves the SPA from static assets and provides:
 *   /api/admin/setup-cloudflare  — one-click D1 provisioning from a pasted API token
 *   /api/admin/*                 — secure admin auth + content management (D1)
 *   /api/posts, /api/products    — public published-content API (D1, cached 30s)
 *
 * DATA ACCESS (hybrid, important):
 *   This Worker reaches D1 two ways and prefers the fastest available:
 *     1. `env.DB` binding — zero-latency, free. Requires d1_databases in
 *        wrangler.jsonc, which only takes effect on a Git deploy.
 *     2. D1 REST API — used when the binding is absent, authenticated with the
 *        CF_API_TOKEN secret saved during provisioning.
 *   Why: this Worker deploys from Git, so wrangler.jsonc is the source of truth
 *   at build time. A binding added over the REST API is discarded by the next
 *   Git build. The REST fallback means the CMS works immediately after setup
 *   with no repo edit and no second manual step, and transparently upgrades to
 *   the faster binding once database_id is committed to wrangler.jsonc.
 */

// ---- Types ----------------------------------------------------------------
type DbState = "binding_missing" | "unreachable" | "ready";
type DbMode = "binding" | "rest" | "none";
interface D1PreparedStatement { bind(...v: unknown[]): D1PreparedStatement; all(): Promise<{ results: unknown[] }>; first<T = Record<string, unknown>>(): Promise<T | null>; run(): Promise<{ meta: unknown }>; }
interface D1Database { prepare(q: string): D1PreparedStatement; }
interface AssetsBinding { fetch(r: Request): Promise<Response> }
interface Env {
  DB?: D1Database;
  ASSETS: AssetsBinding;
  /** Saved as Worker secrets by provisioning; survive Git deploys. */
  CF_API_TOKEN?: string;
  CF_ACCOUNT_ID?: string;
  CF_D1_DATABASE_ID?: string;
}

const MIN_PW = 8;
const PBKDF2_ITERS = 100_000;
const CF_API = "https://api.cloudflare.com/client/v4";
const D1_NAME = "printopia-cms";
/** Must match "name" in wrangler.jsonc — used to write our own secrets/bindings. */
const SCRIPT_NAME = "printopia";

// ---- Response helpers -----------------------------------------------------
function json(data: unknown, init: { status?: number; headers?: Record<string, string> } = {}) {
  return new Response(JSON.stringify(data), { status: init.status ?? 200, headers: { "Content-Type": "application/json; charset=utf-8", "X-Content-Type-Options": "nosniff", "Referrer-Policy": "no-referrer", ...(init.headers ?? {}) } });
}
function fail(code: string, message: string, status: number, extra?: Record<string, unknown>) {
  return json({ ok: false, code, message, ...(extra ?? {}) }, { status });
}
const NO_STORE = { "Cache-Control": "no-store" };
const PUB_CACHE = { "Cache-Control": "public, max-age=30" };

// ---- Crypto ---------------------------------------------------------------
const enc = new TextEncoder();
const toHex = (b: ArrayBuffer) => { let s = ""; for (const v of new Uint8Array(b)) s += v.toString(16).padStart(2, "0"); return s; };
const toB64 = (b: Uint8Array) => { let s = ""; for (const v of b) s += String.fromCharCode(v); return btoa(s); };
const randHex = (n: number) => toHex(crypto.getRandomValues(new Uint8Array(n)).buffer as ArrayBuffer);

async function hashPassword(pw: string) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey("raw", enc.encode(pw), { name: "PBKDF2" }, false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", salt, iterations: PBKDF2_ITERS, hash: "SHA-256" }, key, 256);
  return `${toB64(salt)}:${toHex(bits)}`;
}
async function verifyPassword(pw: string, stored: string) {
  const [sb, exp] = stored.split(":"); if (!sb || !exp) return false;
  const salt = Uint8Array.from(atob(sb), c => c.charCodeAt(0));
  const key = await crypto.subtle.importKey("raw", enc.encode(pw), { name: "PBKDF2" }, false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", salt, iterations: PBKDF2_ITERS, hash: "SHA-256" }, key, 256);
  const c = toHex(bits); if (c.length !== exp.length) return false;
  let d = 0; for (let i = 0; i < exp.length; i++) d |= c.charCodeAt(i) ^ exp.charCodeAt(i); return d === 0;
}
async function hmac(secret: string, msg: string) {
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return toHex(await crypto.subtle.sign("HMAC", key, enc.encode(msg)));
}

// ---- Session --------------------------------------------------------------
const COOKIE = "printopia_admin"; const TTL = 43200;
async function makeSession(secret: string) { const exp = Date.now() + TTL * 1000; const p = `admin.${exp}`; return `${p}.${await hmac(secret, p)}`; }
async function checkSession(secret: string, val: string | null) {
  if (!val) return false; const pts = val.split("."); if (pts.length !== 3) return false;
  const p = `${pts[0]}.${pts[1]}`; const exp = Number(pts[1]); const sig = pts[2];
  if (!Number.isFinite(exp) || exp < Date.now()) return false;
  const e = await hmac(secret, p); if (e.length !== sig.length) return false;
  let d = 0; for (let i = 0; i < sig.length; i++) d |= e.charCodeAt(i) ^ sig.charCodeAt(i); return d === 0;
}
const ckHeader = (v: string, ma: number) => `${COOKIE}=${v}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${ma}`;
const clearCk = () => `${COOKIE}=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0`;
const readCk = (r: Request, n: string) => (r.headers.get("Cookie") ?? "").match(new RegExp(`(?:^|;\\s*)${n}=([^;]+)`))?.[1] ?? null;

// ---------------------------------------------------------------------------
// Db — unified D1 access over either the binding or the REST API.
// ---------------------------------------------------------------------------
/* eslint-disable @typescript-eslint/no-explicit-any */
interface Db {
  mode: DbMode;
  all<T = any>(sql: string, params?: unknown[]): Promise<T[]>;
  first<T = any>(sql: string, params?: unknown[]): Promise<T | null>;
  run(sql: string, params?: unknown[]): Promise<void>;
}

class BindingDb implements Db {
  mode: DbMode = "binding";
  constructor(private db: D1Database) {}
  private stmt(sql: string, params?: unknown[]) {
    const s = this.db.prepare(sql);
    return params && params.length ? s.bind(...params) : s;
  }
  async all<T>(sql: string, params?: unknown[]) { return ((await this.stmt(sql, params).all()).results || []) as T[]; }
  async first<T>(sql: string, params?: unknown[]) { return (await this.stmt(sql, params).first<T>()) ?? null; }
  async run(sql: string, params?: unknown[]) { await this.stmt(sql, params).run(); }
}

/** D1 over the documented REST endpoint: POST /d1/database/{id}/query */
class RestDb implements Db {
  mode: DbMode = "rest";
  constructor(private token: string, private accountId: string, private databaseId: string) {}
  private async exec<T>(sql: string, params?: unknown[]): Promise<T[]> {
    const res = await fetch(`${CF_API}/accounts/${this.accountId}/d1/database/${this.databaseId}/query`, {
      method: "POST",
      headers: { Authorization: `Bearer ${this.token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ sql, params: (params ?? []).map((p) => (p === undefined ? null : p)) }),
    });
    const body = await res.json().catch(() => null) as any;
    if (!res.ok || !body?.success) {
      const msg = body?.errors?.[0]?.message || `HTTP ${res.status}`;
      throw new Error(`D1 REST: ${msg}`);
    }
    return (body.result?.[0]?.results ?? []) as T[];
  }
  async all<T>(sql: string, params?: unknown[]) { return this.exec<T>(sql, params); }
  async first<T>(sql: string, params?: unknown[]) { return (await this.exec<T>(sql, params))[0] ?? null; }
  async run(sql: string, params?: unknown[]) { await this.exec(sql, params); }
}

/** Binding first (fast, free), REST second (works without a Git deploy). */
function getDb(env: Env): Db | null {
  if (env.DB) return new BindingDb(env.DB);
  if (env.CF_API_TOKEN && env.CF_ACCOUNT_ID && env.CF_D1_DATABASE_ID)
    return new RestDb(env.CF_API_TOKEN, env.CF_ACCOUNT_ID, env.CF_D1_DATABASE_ID);
  return null;
}

// ---- Schema ---------------------------------------------------------------
const SCHEMA: string[] = [
  "CREATE TABLE IF NOT EXISTS app_config (key TEXT PRIMARY KEY, value TEXT NOT NULL);",
  "CREATE TABLE IF NOT EXISTS admin (id INTEGER PRIMARY KEY, password_hash TEXT NOT NULL, created_at TEXT NOT NULL);",
  `CREATE TABLE IF NOT EXISTS posts (
    id TEXT PRIMARY KEY, slug TEXT UNIQUE NOT NULL, title TEXT NOT NULL, excerpt TEXT DEFAULT '',
    body TEXT DEFAULT '[]', category TEXT DEFAULT '', tags TEXT DEFAULT '[]', cover TEXT DEFAULT '',
    cover_alt TEXT DEFAULT '', seo_title TEXT DEFAULT '', meta_description TEXT DEFAULT '',
    status TEXT NOT NULL DEFAULT 'draft', created_at TEXT NOT NULL, updated_at TEXT NOT NULL,
    published_at TEXT
  );`,
  "CREATE INDEX IF NOT EXISTS idx_posts_slug ON posts(slug);",
  "CREATE INDEX IF NOT EXISTS idx_posts_status ON posts(status);",
  `CREATE TABLE IF NOT EXISTS products (
    id TEXT PRIMARY KEY, slug TEXT UNIQUE NOT NULL, title TEXT NOT NULL, subtitle TEXT DEFAULT '',
    category TEXT DEFAULT '', price INTEGER NOT NULL DEFAULT 0, old_price INTEGER,
    image TEXT DEFAULT '', short_desc TEXT DEFAULT '', description TEXT DEFAULT '',
    material TEXT DEFAULT 'PLA', colors TEXT DEFAULT '[]', sizes TEXT DEFAULT '[]',
    features TEXT DEFAULT '[]', specs TEXT DEFAULT '[]', care TEXT DEFAULT '',
    badge TEXT DEFAULT '', customizable INTEGER NOT NULL DEFAULT 0, in_stock INTEGER NOT NULL DEFAULT 1,
    featured INTEGER NOT NULL DEFAULT 0, production_days INTEGER NOT NULL DEFAULT 3,
    seo_title TEXT DEFAULT '', meta_description TEXT DEFAULT '',
    status TEXT NOT NULL DEFAULT 'draft', created_at TEXT NOT NULL, updated_at TEXT NOT NULL,
    published_at TEXT
  );`,
  "CREATE INDEX IF NOT EXISTS idx_products_slug ON products(slug);",
  "CREATE INDEX IF NOT EXISTS idx_products_status ON products(status);",
];

async function ensureSchema(db: Db) { for (const sql of SCHEMA) await db.run(sql); }

async function getConfig(db: Db, k: string) { return (await db.first<{ value: string }>("SELECT value FROM app_config WHERE key = ?", [k]))?.value ?? null; }
async function setConfig(db: Db, k: string, v: string) { await db.run("INSERT INTO app_config (key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value", [k, v]); }
async function getAdminHash(db: Db) { return (await db.first<{ password_hash: string }>("SELECT password_hash FROM admin WHERE id=1"))?.password_hash ?? null; }
async function ensureSecret(db: Db) { const ex = await getConfig(db, "session_secret"); if (ex) return ex; const s = randHex(32); await setConfig(db, "session_secret", s); return s; }

/** Verifies reachability and applies idempotent migrations. */
async function resolveDb(env: Env): Promise<{ state: DbState; db: Db | null }> {
  const db = getDb(env);
  if (!db) return { state: "binding_missing", db: null };
  try {
    await db.first("SELECT 1");
    await ensureSchema(db);
    return { state: "ready", db };
  } catch (e) {
    console.error("[printopia] D1 failed:", (e as Error)?.message);
    return { state: "unreachable", db };
  }
}
async function isAdmin(request: Request, db: Db): Promise<boolean> {
  try { const s = await getConfig(db, "session_secret"); return !!s && await checkSession(s, readCk(request, COOKIE)); } catch { return false; }
}

// ---------------------------------------------------------------------------
// Cloudflare provisioning — turns a pasted API token into a working database.
// ---------------------------------------------------------------------------
interface Step { key: string; label: string; ok: boolean; detail?: string }

async function cfFetch(token: string, path: string, init: RequestInit = {}) {
  const res = await fetch(`${CF_API}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", ...(init.headers ?? {}) },
  });
  const body = await res.json().catch(() => null) as any;
  return { res, body, error: body?.errors?.[0]?.message as string | undefined };
}

/**
 * Runs the whole setup: verify token → find account → create/reuse D1 →
 * migrate → persist credentials as Worker secrets → best-effort bind D1.
 * Returns per-step results so the wizard can show exactly where it stopped.
 */
async function provision(token: string): Promise<Response> {
  const steps: Step[] = [];
  const stop = (code: string, message: string, status = 400) => json({ ok: false, code, message, steps }, { status, headers: NO_STORE });

  // 1. Token valid?
  const verify = await cfFetch(token, "/user/tokens/verify");
  if (!verify.res.ok || !verify.body?.success) {
    steps.push({ key: "token", label: "بررسی توکن", ok: false, detail: verify.error });
    return stop("TOKEN_INVALID", verify.res.status === 401
      ? "توکن معتبر نیست یا منقضی شده است. یک توکن تازه بسازید و دوباره وارد کنید."
      : `بررسی توکن ناموفق بود: ${verify.error ?? verify.res.status}`, 400);
  }
  steps.push({ key: "token", label: "بررسی توکن", ok: true });

  // 2. Which account?
  const accts = await cfFetch(token, "/accounts");
  const list = (accts.body?.result ?? []) as { id: string; name: string }[];
  if (!accts.res.ok || list.length === 0) {
    steps.push({ key: "account", label: "یافتن حساب", ok: false, detail: accts.error });
    return stop("ACCOUNT_NOT_FOUND", accts.res.status === 403
      ? "توکن اجازهٔ خواندن حساب را ندارد. مطمئن شوید دسترسی «Account Settings: Read» را انتخاب کرده‌اید."
      : "هیچ حسابی برای این توکن پیدا نشد.", 400);
  }
  const accountId = list[0].id;
  steps.push({ key: "account", label: "یافتن حساب", ok: true, detail: list[0].name });

  // 3. Reuse an existing database before creating one (idempotent re-runs).
  let databaseId = "";
  const existing = await cfFetch(token, `/accounts/${accountId}/d1/database?name=${encodeURIComponent(D1_NAME)}`);
  const found = ((existing.body?.result ?? []) as { uuid?: string; id?: string; name: string }[])
    .find((d) => d.name === D1_NAME);
  if (found) {
    databaseId = (found.uuid || found.id) as string;
    steps.push({ key: "database", label: "پایگاه‌داده", ok: true, detail: "پایگاه‌دادهٔ موجود استفاده شد" });
  } else {
    const created = await cfFetch(token, `/accounts/${accountId}/d1/database`, {
      method: "POST", body: JSON.stringify({ name: D1_NAME }),
    });
    const uuid = created.body?.result?.uuid || created.body?.result?.id;
    if (!created.res.ok || !uuid) {
      steps.push({ key: "database", label: "پایگاه‌داده", ok: false, detail: created.error });
      return stop("D1_CREATE_FAILED", created.res.status === 403
        ? "توکن اجازهٔ ساخت پایگاه‌داده را ندارد. دسترسی «D1: Edit» را اضافه کنید."
        : `ساخت پایگاه‌داده ناموفق بود: ${created.error ?? created.res.status}`, 400);
    }
    databaseId = uuid;
    steps.push({ key: "database", label: "پایگاه‌داده", ok: true, detail: "پایگاه‌دادهٔ تازه ساخته شد" });
  }

  // 4. Migrate over REST (the binding does not exist yet on this request).
  const rest = new RestDb(token, accountId, databaseId);
  try {
    await ensureSchema(rest);
    steps.push({ key: "schema", label: "ساخت جدول‌ها", ok: true });
  } catch (e) {
    steps.push({ key: "schema", label: "ساخت جدول‌ها", ok: false, detail: (e as Error).message });
    return stop("MIGRATION_FAILED", "ساخت جدول‌های پایگاه‌داده ناموفق بود. توکن باید دسترسی «D1: Edit» داشته باشد.", 400);
  }

  // 5. Persist credentials as Worker secrets. These are stored outside
  //    wrangler.jsonc, so they survive every future Git deploy — this is what
  //    makes the REST fallback keep working with no manual step.
  const secrets: [string, string][] = [
    ["CF_API_TOKEN", token],
    ["CF_ACCOUNT_ID", accountId],
    ["CF_D1_DATABASE_ID", databaseId],
  ];
  for (const [name, text] of secrets) {
    const put = await cfFetch(token, `/accounts/${accountId}/workers/scripts/${SCRIPT_NAME}/secrets`, {
      method: "PUT", body: JSON.stringify({ name, text, type: "secret_text" }),
    });
    if (!put.res.ok) {
      steps.push({ key: "secrets", label: "ذخیرهٔ امن دسترسی", ok: false, detail: put.error });
      return stop("SECRET_WRITE_FAILED", put.res.status === 403
        ? "توکن اجازهٔ نوشتن تنظیمات Worker را ندارد. دسترسی «Workers Scripts: Edit» را اضافه کنید."
        : `ذخیرهٔ امن دسترسی ناموفق بود: ${put.error ?? put.res.status}`, 400);
    }
  }
  steps.push({ key: "secrets", label: "ذخیرهٔ امن دسترسی", ok: true });

  // 6. Best-effort: attach the D1 binding for zero-latency access. Not fatal —
  //    the REST fallback already works, and a Git deploy would drop this anyway
  //    unless database_id is committed to wrangler.jsonc.
  const patch = await cfFetch(token, `/accounts/${accountId}/workers/scripts/${SCRIPT_NAME}/script-settings`, {
    method: "PATCH", body: JSON.stringify({ bindings: [{ type: "d1", name: "DB", id: databaseId }] }),
  });
  steps.push({ key: "binding", label: "اتصال سریع پایگاه‌داده", ok: patch.res.ok, detail: patch.res.ok ? undefined : patch.error });

  return json({
    ok: true, steps, accountId, databaseId,
    // Shown in the wizard so the owner can make access permanently fastest.
    wranglerSnippet: `"d1_databases": [\n  {\n    "binding": "DB",\n    "database_name": "${D1_NAME}",\n    "database_id": "${databaseId}"\n  }\n]`,
  }, { headers: NO_STORE });
}

// ---- Post helpers ---------------------------------------------------------
function parseJson<T>(raw: unknown, fallback: T): T { try { return raw ? JSON.parse(String(raw)) as T : fallback; } catch { return fallback; } }
function readingMin(blocks: any[]): number { const t = blocks.map(b => b.text || (b.items || []).join(" ")).join(" "); return Math.max(1, Math.round(t.trim().split(/\s+/).filter(Boolean).length / 200)); }
function slugify(s: string): string { return s.trim().replace(/\s+/g, "-").replace(/[؟?،,.]/g, "").slice(0, 80) || `item-${Date.now()}`; }

function rowToPublic(r: any) {
  const blocks = parseJson<any[]>(r.body, []);
  return { slug: r.slug, title: r.title, excerpt: r.excerpt || "", category: r.category || "عمومی",
    author: "تیم پرینتوپیا", date: r.published_at || r.updated_at, readingMinutes: readingMin(blocks),
    image: r.cover || "", content: blocks };
}
function rowToAdmin(r: any) {
  return { id: r.id, slug: r.slug, title: r.title, excerpt: r.excerpt || "", body: parseJson<any[]>(r.body, []),
    category: r.category || "", tags: parseJson<string[]>(r.tags, []), cover: r.cover || "",
    coverAlt: r.cover_alt || "", seoTitle: r.seo_title || "", metaDescription: r.meta_description || "",
    status: r.status, faqs: [], relatedProductSlugs: [], relatedPostSlugs: [],
    createdAt: r.created_at, updatedAt: r.updated_at, publishDate: r.published_at || "" };
}

// ---- Product helpers ------------------------------------------------------
function productToPublic(r: any) {
  return {
    id: r.id, slug: r.slug, title: r.title, subtitle: r.subtitle || "", category: r.category || "",
    price: Number(r.price) || 0, oldPrice: r.old_price ? Number(r.old_price) : undefined,
    image: r.image || "", material: r.material || "PLA",
    colors: parseJson<any[]>(r.colors, []), sizes: parseJson<any[]>(r.sizes, []),
    features: parseJson<string[]>(r.features, []), specs: parseJson<any[]>(r.specs, []),
    shortDesc: r.short_desc || "", description: r.description || "", care: r.care || "",
    badge: r.badge || undefined, customizable: !!r.customizable, inStock: !!r.in_stock,
    featured: !!r.featured, productionDays: Number(r.production_days) || 3,
    collectionIds: [], materials: [r.material || "PLA"], suitableFor: [],
  };
}
function productToAdmin(r: any) {
  return { ...productToPublic(r), status: r.status, seoTitle: r.seo_title || "",
    metaDescription: r.meta_description || "", createdAt: r.created_at, updatedAt: r.updated_at };
}
/** Column order shared by product INSERT and UPDATE. */
function productValues(b: any) {
  return [
    String(b.title ?? "").trim(), b.subtitle || "", b.category || "",
    Number(b.price) || 0, b.oldPrice ? Number(b.oldPrice) : null,
    b.image || "", b.shortDesc || "", b.description || "", b.material || "PLA",
    JSON.stringify(b.colors ?? []), JSON.stringify(b.sizes ?? []),
    JSON.stringify(b.features ?? []), JSON.stringify(b.specs ?? []), b.care || "",
    b.badge || "", b.customizable ? 1 : 0, b.inStock === false ? 0 : 1,
    b.featured ? 1 : 0, Number(b.productionDays) || 3,
    b.seoTitle || "", b.metaDescription || "",
  ];
}
const PRODUCT_COLS = "title,subtitle,category,price,old_price,image,short_desc,description,material,colors,sizes,features,specs,care,badge,customizable,in_stock,featured,production_days,seo_title,meta_description";

// ---- Rate limit -----------------------------------------------------------
const attempts = new Map<string, { c: number; t: number }>();
const rl = (k: string, m: number, w: number) => { const n = Date.now(); const r = attempts.get(k); if (!r || n - r.t > w) { attempts.set(k, { c: 1, t: n }); return true; } r.c++; return r.c <= m; };

// ---- Router ---------------------------------------------------------------
async function handleApi(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const path = url.pathname.replace(/\/$/, "");
  const method = request.method;
  // Only bodied requests must be JSON. DELETE carries no body, so requiring a
  // Content-Type there rejected legitimate deletes.
  const hasBody = method === "POST" || method === "PUT" || method === "PATCH";
  if (hasBody && !(request.headers.get("Content-Type") ?? "").includes("application/json"))
    return fail("UNSUPPORTED_MEDIA_TYPE", "درخواست نامعتبر است.", 415);

  const body = hasBody ? await request.json().catch(() => ({})) as any : {};

  try {
    // ---- SETUP: provision Cloudflare from a pasted token ----
    // Open before setup completes (there is no admin account yet), rate-limited,
    // and refused once an admin exists unless the caller is signed in.
    if (path === "/api/admin/setup-cloudflare" && method === "POST") {
      const ip = request.headers.get("CF-Connecting-IP") ?? "?";
      if (!rl(`prov:${ip}`, 5, 60000)) return fail("RATE_LIMITED", "تلاش‌های زیادی انجام شد. یک دقیقه صبر کنید.", 429);
      const token = String(body.token ?? "").trim();
      if (!token) return fail("TOKEN_MISSING", "توکن را وارد کنید.", 400);

      // If the CMS is already set up, only an admin may re-run provisioning.
      const cur = getDb(env);
      if (cur) {
        try {
          if ((await getAdminHash(cur)) !== null && !(await isAdmin(request, cur)))
            return fail("UNAUTHORIZED", "برای تنظیم مجدد باید وارد شوید.", 401);
        } catch { /* unreachable db — allow setup to proceed and fix it */ }
      }
      return provision(token);
    }

    // ---- AUTH: status ----
    if (path === "/api/admin/status" && method === "GET") {
      const { state, db } = await resolveDb(env);
      const setupComplete = state === "ready" && db !== null && (await getAdminHash(db)) !== null;
      let authed = false;
      if (setupComplete && db) { const s = await getConfig(db, "session_secret"); if (s) authed = await checkSession(s, readCk(request, COOKIE)); }
      return json({
        ok: true, dbState: state, setupComplete, authed,
        dbMode: db?.mode ?? "none",
        // Lets the wizard skip the Cloudflare step when it is already done.
        cloudflareConnected: !!(env.DB || env.CF_D1_DATABASE_ID),
      }, { headers: NO_STORE });
    }

    // ---- AUTH: setup (create the admin account) ----
    if (path === "/api/admin/setup" && method === "POST") {
      const { state, db } = await resolveDb(env);
      if (state !== "ready" || !db) return fail("DB_NOT_READY", state === "binding_missing" ? "ابتدا اتصال Cloudflare را کامل کنید." : "پایگاه‌داده در دسترس نیست.", 503, { dbState: state });
      const ip = request.headers.get("CF-Connecting-IP") ?? "?";
      if (!rl(`setup:${ip}`, 10, 60000)) return fail("RATE_LIMITED", "تلاش‌های زیادی انجام شد.", 429);
      const pw = String(body.password ?? ""), cf = String(body.confirm ?? "");
      if (pw.length < MIN_PW) return fail("INVALID_PASSWORD_POLICY", `رمز حداقل ${MIN_PW} نویسه.`, 400);
      if (pw !== cf) return fail("PASSWORD_MISMATCH", "رمز و تکرار یکسان نیستند.", 400);
      if ((await getAdminHash(db)) !== null) { await ensureSecret(db).catch(() => {}); return fail("ADMIN_ALREADY_EXISTS", "حساب مدیر قبلاً ساخته شده.", 409); }
      let secret: string;
      try { secret = await ensureSecret(db); } catch { return fail("SESSION_INIT_FAILED", "خطای نشست.", 500); }
      let hash: string; try { hash = await hashPassword(pw); } catch { return fail("HASHING_FAILED", "خطای پردازش رمز.", 500); }
      try { await db.run("INSERT INTO admin (id,password_hash,created_at) VALUES(1,?,?) ON CONFLICT(id) DO UPDATE SET password_hash=excluded.password_hash", [hash, new Date().toISOString()]); }
      catch { return fail("DB_INSERT_FAILED", "ذخیره‌سازی ناموفق.", 500); }
      let session: string; try { session = await makeSession(secret); } catch { return fail("SESSION_INIT_FAILED", "خطای نشست.", 500); }
      return json({ ok: true }, { headers: { "Set-Cookie": ckHeader(session, TTL), ...NO_STORE } });
    }

    // ---- AUTH: login ----
    if (path === "/api/admin/login" && method === "POST") {
      const { state, db } = await resolveDb(env);
      if (state !== "ready" || !db) return fail("DB_NOT_READY", "پایگاه‌داده در دسترس نیست.", 503);
      if ((await getAdminHash(db)) === null) return fail("SETUP_INCOMPLETE", "راه‌اندازی کامل نشده.", 409, { needSetup: true });
      const ip = request.headers.get("CF-Connecting-IP") ?? "?";
      if (!rl(`login:${ip}`, 8, 60000)) return fail("RATE_LIMITED", "تلاش‌های زیادی انجام شد.", 429);
      const stored = await getAdminHash(db);
      if (!stored || !(await verifyPassword(String(body.password ?? ""), stored))) return fail("PASSWORD_MISMATCH", "رمز نادرست.", 401);
      const secret = await ensureSecret(db);
      return json({ ok: true }, { headers: { "Set-Cookie": ckHeader(await makeSession(secret), TTL), ...NO_STORE } });
    }
    if (path === "/api/admin/logout" && method === "POST")
      return json({ ok: true }, { headers: { "Set-Cookie": clearCk(), ...NO_STORE } });

    // Everything below needs a database.
    const db = getDb(env);

    // ---- PUBLIC: posts ----
    if (path === "/api/posts" && method === "GET") {
      if (!db) return json({ posts: [] }, { headers: PUB_CACHE });
      const rows = await db.all("SELECT * FROM posts WHERE status='published' ORDER BY published_at DESC");
      return json({ posts: rows.map(rowToPublic) }, { headers: PUB_CACHE });
    }
    if (path.startsWith("/api/posts/") && method === "GET") {
      // "/api/posts/" is 11 chars — slicing 12 silently dropped the slug's first character.
      const slug = decodeURIComponent(path.slice("/api/posts/".length));
      if (!db) return fail("NOT_FOUND", "پیدا نشد.", 404);
      const row = await db.first("SELECT * FROM posts WHERE slug=? AND status='published'", [slug]);
      if (!row) return fail("NOT_FOUND", "پیدا نشد.", 404);
      return json({ post: rowToPublic(row) }, { headers: PUB_CACHE });
    }

    // ---- PUBLIC: products ----
    if (path === "/api/products" && method === "GET") {
      if (!db) return json({ products: [] }, { headers: PUB_CACHE });
      const rows = await db.all("SELECT * FROM products WHERE status='published' ORDER BY updated_at DESC");
      return json({ products: rows.map(productToPublic) }, { headers: PUB_CACHE });
    }
    if (path.startsWith("/api/products/") && method === "GET") {
      const slug = decodeURIComponent(path.slice("/api/products/".length));
      if (!db) return fail("NOT_FOUND", "پیدا نشد.", 404);
      const row = await db.first("SELECT * FROM products WHERE slug=? AND status='published'", [slug]);
      if (!row) return fail("NOT_FOUND", "پیدا نشد.", 404);
      return json({ product: productToPublic(row) }, { headers: PUB_CACHE });
    }

    // ---- PUBLIC: site settings (nav, contact, appearance) ----
    if (path === "/api/site" && method === "GET") {
      if (!db) return json({ settings: null }, { headers: PUB_CACHE });
      const raw = await getConfig(db, "site_settings");
      return json({ settings: parseJson<any>(raw, null) }, { headers: PUB_CACHE });
    }

    // ---- Admin gate ----
    if (path.startsWith("/api/admin/")) {
      if (!db) return fail("DB_NOT_READY", "ابتدا اتصال Cloudflare را کامل کنید.", 503, { dbState: "binding_missing" });
      if (!(await isAdmin(request, db))) return fail("UNAUTHORIZED", "غیرمجاز.", 401);
    }

    // ---- ADMIN: posts ----
    if (path === "/api/admin/posts" && method === "GET") {
      const rows = await db!.all("SELECT * FROM posts ORDER BY updated_at DESC");
      return json({ posts: rows.map(rowToAdmin) }, { headers: NO_STORE });
    }
    if (path === "/api/admin/posts" && method === "POST") {
      const title = String(body.title ?? "").trim();
      if (!title) return fail("TITLE_REQUIRED", "عنوان الزامی است.", 400);
      const slug = String(body.slug ?? "").trim() || slugify(title);
      if (await db!.first("SELECT id FROM posts WHERE slug=?", [slug])) return fail("SLUG_TAKEN", "این اسلاگ قبلاً استفاده شده است.", 409);
      const id = `post_${Date.now().toString(36)}`, now = new Date().toISOString();
      const status = body.status === "published" ? "published" : "draft";
      await db!.run("INSERT INTO posts (id,slug,title,excerpt,body,category,tags,cover,cover_alt,seo_title,meta_description,status,created_at,updated_at,published_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
        [id, slug, title, body.excerpt || "", JSON.stringify(body.body ?? []), body.category || "", JSON.stringify(body.tags ?? []), body.cover || "", body.coverAlt || "", body.seoTitle || "", body.metaDescription || "", status, now, now, status === "published" ? now : null]);
      const row = await db!.first("SELECT * FROM posts WHERE id=?", [id]);
      return json({ ok: true, post: rowToAdmin(row) }, { headers: NO_STORE });
    }
    if (path.startsWith("/api/admin/posts/") && (method === "PUT" || method === "DELETE")) {
      // "/api/admin/posts/" is 17 chars — slicing 18 corrupted every id.
      const id = decodeURIComponent(path.slice("/api/admin/posts/".length));
      if (!id) return fail("NOT_FOUND", "شناسه نامعتبر است.", 400);
      if (method === "DELETE") {
        if (!(await db!.first("SELECT id FROM posts WHERE id=?", [id]))) return fail("NOT_FOUND", "پست پیدا نشد.", 404);
        await db!.run("DELETE FROM posts WHERE id=?", [id]);
        return json({ ok: true }, { headers: NO_STORE });
      }
      const title = String(body.title ?? "").trim();
      if (!title) return fail("TITLE_REQUIRED", "عنوان الزامی است.", 400);
      if (!(await db!.first("SELECT id FROM posts WHERE id=?", [id]))) return fail("NOT_FOUND", "پست پیدا نشد.", 404);
      const slug = String(body.slug ?? "").trim() || slugify(title);
      if (await db!.first("SELECT id FROM posts WHERE slug=? AND id!=?", [slug, id])) return fail("SLUG_TAKEN", "این اسلاگ قبلاً استفاده شده است.", 409);
      const now = new Date().toISOString();
      const status = body.status === "published" ? "published" : body.status === "archived" ? "archived" : "draft";
      await db!.run("UPDATE posts SET slug=?,title=?,excerpt=?,body=?,category=?,tags=?,cover=?,cover_alt=?,seo_title=?,meta_description=?,status=?,updated_at=?,published_at=? WHERE id=?",
        [slug, title, body.excerpt || "", JSON.stringify(body.body ?? []), body.category || "", JSON.stringify(body.tags ?? []), body.cover || "", body.coverAlt || "", body.seoTitle || "", body.metaDescription || "", status, now, status === "published" ? (body.publishDate || now) : null, id]);
      const row = await db!.first("SELECT * FROM posts WHERE id=?", [id]);
      return json({ ok: true, post: rowToAdmin(row) }, { headers: NO_STORE });
    }

    // ---- ADMIN: products ----
    if (path === "/api/admin/products" && method === "GET") {
      const rows = await db!.all("SELECT * FROM products ORDER BY updated_at DESC");
      return json({ products: rows.map(productToAdmin) }, { headers: NO_STORE });
    }
    if (path === "/api/admin/products" && method === "POST") {
      const title = String(body.title ?? "").trim();
      if (!title) return fail("TITLE_REQUIRED", "نام محصول الزامی است.", 400);
      const slug = String(body.slug ?? "").trim() || slugify(title);
      if (await db!.first("SELECT id FROM products WHERE slug=?", [slug])) return fail("SLUG_TAKEN", "این اسلاگ قبلاً استفاده شده است.", 409);
      const id = `prod_${Date.now().toString(36)}`, now = new Date().toISOString();
      const status = body.status === "published" ? "published" : "draft";
      await db!.run(`INSERT INTO products (id,slug,${PRODUCT_COLS},status,created_at,updated_at,published_at) VALUES(${new Array(25).fill("?").join(",")})`,
        [id, slug, ...productValues(body), status, now, now, status === "published" ? now : null]);
      const row = await db!.first("SELECT * FROM products WHERE id=?", [id]);
      return json({ ok: true, product: productToAdmin(row) }, { headers: NO_STORE });
    }
    if (path.startsWith("/api/admin/products/") && (method === "PUT" || method === "DELETE")) {
      const id = decodeURIComponent(path.slice("/api/admin/products/".length));
      if (!id) return fail("NOT_FOUND", "شناسه نامعتبر است.", 400);
      if (method === "DELETE") {
        if (!(await db!.first("SELECT id FROM products WHERE id=?", [id]))) return fail("NOT_FOUND", "محصول پیدا نشد.", 404);
        await db!.run("DELETE FROM products WHERE id=?", [id]);
        return json({ ok: true }, { headers: NO_STORE });
      }
      const title = String(body.title ?? "").trim();
      if (!title) return fail("TITLE_REQUIRED", "نام محصول الزامی است.", 400);
      if (!(await db!.first("SELECT id FROM products WHERE id=?", [id]))) return fail("NOT_FOUND", "محصول پیدا نشد.", 404);
      const slug = String(body.slug ?? "").trim() || slugify(title);
      if (await db!.first("SELECT id FROM products WHERE slug=? AND id!=?", [slug, id])) return fail("SLUG_TAKEN", "این اسلاگ قبلاً استفاده شده است.", 409);
      const now = new Date().toISOString();
      const status = body.status === "published" ? "published" : body.status === "archived" ? "archived" : "draft";
      const sets = PRODUCT_COLS.split(",").map((c) => `${c}=?`).join(",");
      await db!.run(`UPDATE products SET slug=?,${sets},status=?,updated_at=?,published_at=? WHERE id=?`,
        [slug, ...productValues(body), status, now, status === "published" ? (body.publishDate || now) : null, id]);
      const row = await db!.first("SELECT * FROM products WHERE id=?", [id]);
      return json({ ok: true, product: productToAdmin(row) }, { headers: NO_STORE });
    }

    // ---- ADMIN: settings blobs (site, nav, footer, seo, appearance, redirects) ----
    if (path.startsWith("/api/admin/config/") && (method === "GET" || method === "PUT")) {
      const key = decodeURIComponent(path.slice("/api/admin/config/".length));
      const allowed = ["site_settings", "navigation", "footer", "seo", "appearance", "redirects", "categories", "homepage"];
      if (!allowed.includes(key)) return fail("NOT_FOUND", "کلید تنظیمات نامعتبر است.", 404);
      if (method === "GET") return json({ ok: true, key, value: parseJson<any>(await getConfig(db!, key), null) }, { headers: NO_STORE });
      await setConfig(db!, key, JSON.stringify(body.value ?? null));
      return json({ ok: true, key }, { headers: NO_STORE });
    }

    // ---- ADMIN: dashboard counts ----
    if (path === "/api/admin/stats" && method === "GET") {
      const p = await db!.first<{ published: number; drafts: number }>("SELECT SUM(status='published') AS published, SUM(status='draft') AS drafts FROM posts");
      const pr = await db!.first<{ active: number }>("SELECT SUM(status='published') AS active FROM products");
      return json({ ok: true, posts: { published: Number(p?.published) || 0, drafts: Number(p?.drafts) || 0 }, products: { active: Number(pr?.active) || 0 } }, { headers: NO_STORE });
    }

    return fail("NOT_FOUND", "پیدا نشد.", 404);
  } catch (e) {
    console.error("[printopia] unhandled:", (e as Error)?.message);
    return fail("UNKNOWN_ERROR", "خطایی رخ داد. کمی بعد دوباره تلاش کنید.", 500);
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (new URL(request.url).pathname.startsWith("/api/")) return handleApi(request, env);
    return env.ASSETS.fetch(request);
  },
};
