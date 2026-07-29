/**
 * Printopia Worker — serves the SPA from static assets and provides:
 *   /api/admin/*  — secure admin auth + content management (D1)
 *   /api/posts    — public published-content API (D1, cached 30s)
 *
 * D1 tables: app_config, admin (auth), posts (CMS content).
 * Static assets served asset-first; Worker runs first only for /api/*.
 */

// ---- Types ----------------------------------------------------------------
type DbState = "binding_missing" | "unreachable" | "ready";
interface D1PreparedStatement { bind(...v: unknown[]): D1PreparedStatement; all(): Promise<{ results: unknown[] }>; first<T = Record<string, unknown>>(): Promise<T | null>; run(): Promise<{ meta: unknown }>; }
interface D1Database { prepare(q: string): D1PreparedStatement; }
interface AssetsBinding { fetch(r: Request): Promise<Response> }
interface Env { DB?: D1Database; ASSETS: AssetsBinding }

const MIN_PW = 8;
const PBKDF2_ITERS = 100_000;

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

// ---- D1 helpers -----------------------------------------------------------
async function ensureSchema(env: Env) {
  if (!env.DB) return;
  await env.DB.prepare("CREATE TABLE IF NOT EXISTS app_config (key TEXT PRIMARY KEY, value TEXT NOT NULL);").run();
  await env.DB.prepare("CREATE TABLE IF NOT EXISTS admin (id INTEGER PRIMARY KEY, password_hash TEXT NOT NULL, created_at TEXT NOT NULL);").run();
  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS posts (
    id TEXT PRIMARY KEY, slug TEXT UNIQUE NOT NULL, title TEXT NOT NULL, excerpt TEXT DEFAULT '',
    body TEXT DEFAULT '[]', category TEXT DEFAULT '', tags TEXT DEFAULT '[]', cover TEXT DEFAULT '',
    cover_alt TEXT DEFAULT '', seo_title TEXT DEFAULT '', meta_description TEXT DEFAULT '',
    status TEXT NOT NULL DEFAULT 'draft', created_at TEXT NOT NULL, updated_at TEXT NOT NULL,
    published_at TEXT
  );`).run();
  await env.DB.prepare("CREATE INDEX IF NOT EXISTS idx_posts_slug ON posts(slug);").run();
  await env.DB.prepare("CREATE INDEX IF NOT EXISTS idx_posts_status ON posts(status);").run();
}
async function getConfig(env: Env, k: string) { if (!env.DB) return null; return (await env.DB.prepare("SELECT value FROM app_config WHERE key = ?").bind(k).first<{ value: string }>())?.value ?? null; }
async function setConfig(env: Env, k: string, v: string) { if (env.DB) await env.DB.prepare("INSERT INTO app_config (key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value").bind(k, v).run(); }
async function getAdminHash(env: Env) { if (!env.DB) return null; return (await env.DB.prepare("SELECT password_hash FROM admin WHERE id=1").first<{ password_hash: string }>())?.password_hash ?? null; }
async function ensureSecret(env: Env) { const ex = await getConfig(env, "session_secret"); if (ex) return ex; const s = randHex(32); await setConfig(env, "session_secret", s); return s; }

async function resolveDb(env: Env): Promise<DbState> {
  if (!env.DB) return "binding_missing";
  try { await env.DB.prepare("SELECT 1").first(); await ensureSchema(env); return "ready"; }
  catch (e) { console.error("[printopia] D1 failed:", (e as Error)?.name); return "unreachable"; }
}
async function isAdmin(request: Request, env: Env): Promise<boolean> {
  try { const s = await getConfig(env, "session_secret"); return !!s && await checkSession(s, readCk(request, COOKIE)); } catch { return false; }
}

// ---- Post helpers ---------------------------------------------------------
/* eslint-disable @typescript-eslint/no-explicit-any */
function parseBlocks(body: string | null): any[] { try { return body ? JSON.parse(body) : []; } catch { return []; } }
function readingMin(blocks: any[]): number { const t = blocks.map(b => b.text || (b.items || []).join(" ")).join(" "); return Math.max(1, Math.round(t.trim().split(/\s+/).filter(Boolean).length / 200)); }
function slugify(s: string): string { return s.trim().replace(/\s+/g, "-").replace(/[؟?،,.]/g, "").slice(0, 80) || `post-${Date.now()}`; }

function rowToPublic(r: any) {
  const blocks = parseBlocks(r.body);
  return { slug: r.slug, title: r.title, excerpt: r.excerpt || "", category: r.category || "عمومی",
    author: "تیم پرینتوپیا", date: r.published_at || r.updated_at, readingMinutes: readingMin(blocks),
    image: r.cover || "", content: blocks };
}
function rowToAdmin(r: any) {
  return { id: r.id, slug: r.slug, title: r.title, excerpt: r.excerpt || "", body: parseBlocks(r.body),
    category: r.category || "", tags: r.tags ? JSON.parse(r.tags) : [], cover: r.cover || "",
    coverAlt: r.cover_alt || "", seoTitle: r.seo_title || "", metaDescription: r.meta_description || "",
    status: r.status, faqs: [], relatedProductSlugs: [], relatedPostSlugs: [],
    createdAt: r.created_at, updatedAt: r.updated_at, publishDate: r.published_at || "" };
}

// ---- Rate limit -----------------------------------------------------------
const attempts = new Map<string, { c: number; t: number }>();
const rl = (k: string, m: number, w: number) => { const n = Date.now(); const r = attempts.get(k); if (!r || n - r.t > w) { attempts.set(k, { c: 1, t: n }); return true; } r.c++; return r.c <= m; };

// ---- Router ---------------------------------------------------------------
async function handleApi(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const path = url.pathname.replace(/\/$/, "");
  if (request.method !== "GET" && request.headers.get("Content-Type") !== "application/json")
    return fail("UNKNOWN_ERROR", "درخواست نامعتبر است.", 415);

  try {
    // ---- AUTH: status ----
    if (path === "/api/admin/status" && request.method === "GET") {
      const dbState = await resolveDb(env);
      const setupComplete = dbState === "ready" && (await getAdminHash(env)) !== null;
      let authed = false;
      if (setupComplete) { const s = await getConfig(env, "session_secret"); if (s) authed = await checkSession(s, readCk(request, COOKIE)); }
      return json({ ok: true, dbState, setupComplete, authed });
    }
    // ---- AUTH: setup ----
    if (path === "/api/admin/setup" && request.method === "POST") {
      const dbState = await resolveDb(env);
      if (dbState !== "ready") return fail("DB_NOT_READY", dbState === "binding_missing" ? "اتصال پایگاه‌داده ثبت نشده." : "پایگاه‌داده در دسترس نیست.", 503, { dbState });
      const ip = request.headers.get("CF-Connecting-IP") ?? "?";
      if (!rl(`setup:${ip}`, 10, 60000)) return fail("RATE_LIMITED", "تلاش‌های زیادی.", 429);
      const b = await request.json().catch(() => ({}));
      const pw = String(b.password ?? ""), cf = String(b.confirm ?? "");
      if (pw.length < MIN_PW) return fail("INVALID_PASSWORD_POLICY", `رمز حداقل ${MIN_PW} نویسه.`, 400);
      if (pw !== cf) return fail("PASSWORD_MISMATCH", "رمز و تکرار یکسان نیستند.", 400);
      if ((await getAdminHash(env)) !== null) { await ensureSecret(env).catch(() => {}); return fail("ADMIN_ALREADY_EXISTS", "حساب مدیر قبلاً ساخته شده.", 409); }
      let secret: string;
      try { secret = await ensureSecret(env); } catch { return fail("SESSION_INIT_FAILED", "خطای نشست.", 500); }
      let hash: string; try { hash = await hashPassword(pw); } catch { return fail("HASHING_FAILED", "خطای پردازش رمز.", 500); }
      try { await env.DB!.prepare("INSERT INTO admin (id,password_hash,created_at) VALUES(1,?,?) ON CONFLICT(id) DO UPDATE SET password_hash=excluded.password_hash").bind(hash, new Date().toISOString()).run(); }
      catch { return fail("DB_INSERT_FAILED", "ذخیره‌سازی ناموفق.", 500); }
      let session: string; try { session = await makeSession(secret); } catch { return fail("SESSION_INIT_FAILED", "خطای نشست.", 500); }
      return json({ ok: true }, { headers: { "Set-Cookie": ckHeader(session, TTL) } });
    }
    // ---- AUTH: login ----
    if (path === "/api/admin/login" && request.method === "POST") {
      if ((await resolveDb(env)) !== "ready") return fail("DB_NOT_READY", "پایگاه‌داده در دسترس نیست.", 503);
      if ((await getAdminHash(env)) === null) return fail("ADMIN_ALREADY_EXISTS", "راه‌اندازی کامل نشده.", 409, { needSetup: true });
      const ip = request.headers.get("CF-Connecting-IP") ?? "?";
      if (!rl(`login:${ip}`, 8, 60000)) return fail("RATE_LIMITED", "تلاش‌های زیادی.", 429);
      const b = await request.json().catch(() => ({})); const pw = String(b.password ?? "");
      const stored = await getAdminHash(env);
      if (!stored || !(await verifyPassword(pw, stored))) return fail("PASSWORD_MISMATCH", "رمز نادرست.", 401);
      const secret = await ensureSecret(env);
      return json({ ok: true }, { headers: { "Set-Cookie": ckHeader(await makeSession(secret), TTL) } });
    }
    if (path === "/api/admin/logout" && request.method === "POST")
      return json({ ok: true }, { headers: { "Set-Cookie": clearCk() } });

    // ---- PUBLIC: posts list ----
    if (path === "/api/posts" && request.method === "GET") {
      if (!env.DB) return json({ posts: [] }, { headers: PUB_CACHE });
      const { results } = await env.DB.prepare("SELECT * FROM posts WHERE status='published' ORDER BY published_at DESC").all();
      return json({ posts: (results || []).map(rowToPublic) }, { headers: PUB_CACHE });
    }
    // ---- PUBLIC: single post ----
    if (path.startsWith("/api/posts/") && request.method === "GET") {
      const slug = path.slice(12);
      if (!env.DB) return json({ message: "پیدا نشد." }, { status: 404 });
      const row = await env.DB.prepare("SELECT * FROM posts WHERE slug=? AND status='published'").bind(slug).first<any>();
      if (!row) return json({ message: "پیدا نشد." }, { status: 404 });
      return json({ post: rowToPublic(row) }, { headers: PUB_CACHE });
    }

    // ---- ADMIN: list all posts ----
    if (path === "/api/admin/posts" && request.method === "GET") {
      if (!(await isAdmin(request, env))) return fail("UNKNOWN_ERROR", "غیرمجاز.", 401);
      const { results } = await env.DB!.prepare("SELECT * FROM posts ORDER BY updated_at DESC").all();
      return json({ posts: (results || []).map(rowToAdmin) }, { headers: NO_STORE });
    }
    // ---- ADMIN: create post ----
    if (path === "/api/admin/posts" && request.method === "POST") {
      if (!(await isAdmin(request, env))) return fail("UNKNOWN_ERROR", "غیرمجاز.", 401);
      const b = await request.json().catch(() => ({}));
      const title = String(b.title ?? "").trim();
      if (!title) return fail("INVALID_PASSWORD_POLICY", "عنوان الزامی است.", 400);
      const slug = String(b.slug ?? "").trim() || slugify(title);
      const ex = await env.DB!.prepare("SELECT id FROM posts WHERE slug=?").bind(slug).first();
      if (ex) return fail("UNKNOWN_ERROR", "این اسلاگ قبلاً استفاده شده.", 409);
      const id = `post_${Date.now().toString(36)}`, now = new Date().toISOString();
      const status = b.status === "published" ? "published" : "draft";
      await env.DB!.prepare("INSERT INTO posts (id,slug,title,excerpt,body,category,tags,cover,cover_alt,seo_title,meta_description,status,created_at,updated_at,published_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)")
        .bind(id, slug, title, b.excerpt || "", JSON.stringify(b.body || []), b.category || "", JSON.stringify(b.tags || []), b.cover || "", b.coverAlt || "", b.seoTitle || "", b.metaDescription || "", status, now, now, status === "published" ? now : null).run();
      const row = await env.DB!.prepare("SELECT * FROM posts WHERE id=?").bind(id).first<any>();
      return json({ ok: true, post: rowToAdmin(row) }, { headers: NO_STORE });
    }
    // ---- ADMIN: update post ----
    if (path.startsWith("/api/admin/posts/") && request.method === "PUT") {
      if (!(await isAdmin(request, env))) return fail("UNKNOWN_ERROR", "غیرمجاز.", 401);
      const id = path.slice(18);
      const b = await request.json().catch(() => ({}));
      const title = String(b.title ?? "").trim();
      if (!title) return fail("INVALID_PASSWORD_POLICY", "عنوان الزامی است.", 400);
      const slug = String(b.slug ?? "").trim() || slugify(title);
      const dup = await env.DB!.prepare("SELECT id FROM posts WHERE slug=? AND id!=?").bind(slug, id).first();
      if (dup) return fail("UNKNOWN_ERROR", "این اسلاگ قبلاً استفاده شده.", 409);
      const now = new Date().toISOString();
      const status = b.status === "published" ? "published" : b.status === "archived" ? "archived" : "draft";
      const pubAt = status === "published" ? (b.publishDate || now) : null;
      await env.DB!.prepare("UPDATE posts SET slug=?,title=?,excerpt=?,body=?,category=?,tags=?,cover=?,cover_alt=?,seo_title=?,meta_description=?,status=?,updated_at=?,published_at=? WHERE id=?")
        .bind(slug, title, b.excerpt || "", JSON.stringify(b.body || []), b.category || "", JSON.stringify(b.tags || []), b.cover || "", b.coverAlt || "", b.seoTitle || "", b.metaDescription || "", status, now, pubAt, id).run();
      const row = await env.DB!.prepare("SELECT * FROM posts WHERE id=?").bind(id).first<any>();
      return json({ ok: true, post: rowToAdmin(row) }, { headers: NO_STORE });
    }
    // ---- ADMIN: delete post ----
    if (path.startsWith("/api/admin/posts/") && request.method === "DELETE") {
      if (!(await isAdmin(request, env))) return fail("UNKNOWN_ERROR", "غیرمجاز.", 401);
      const id = path.slice(18);
      await env.DB!.prepare("DELETE FROM posts WHERE id=?").bind(id).run();
      return json({ ok: true }, { headers: NO_STORE });
    }

    return fail("UNKNOWN_ERROR", "پیدا نشد.", 404);
  } catch (e) {
    console.error("[printopia] unhandled:", (e as Error)?.name);
    return fail("UNKNOWN_ERROR", "خطایی رخ داد.", 500);
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (new URL(request.url).pathname.startsWith("/api/")) return handleApi(request, env);
    return env.ASSETS.fetch(request);
  },
};
