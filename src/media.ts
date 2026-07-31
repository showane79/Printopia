/**
 * Server-side media subsystem (Worker runtime).
 *
 * STORAGE
 *   Bytes live in Cloudflare R2. Metadata lives in D1 (`media` table). D1 never
 *   stores binary data, and nothing is ever kept in browser storage.
 *
 * TWO ACCESS PATHS (mirrors the D1 strategy in worker.ts)
 *   1. `env.MEDIA` R2 binding — fastest, free, requires r2_buckets in
 *      wrangler.jsonc (takes effect on a Git deploy).
 *   2. R2 REST API (`/accounts/{id}/r2/buckets/{bucket}/objects/{key}`) — used
 *      when the binding is absent, authenticated with the CF_API_TOKEN secret
 *      written during provisioning. This is what makes uploads work right after
 *      setup with no repo edit.
 *
 * DELIVERY
 *   Objects are served by the Worker at `/media/<key>` (same-origin, immutable
 *   cache). No public bucket, no r2.dev, no custom domain required — so there is
 *   no manual Cloudflare dashboard step. If a custom media domain is configured
 *   later, `mediaUrl()` will emit absolute URLs instead.
 *
 * OPTIONAL BY DESIGN
 *   R2 is a *capability*, not a requirement. Many Cloudflare accounts have R2
 *   switched off (the API answers with code 10042 until the owner enables it in
 *   the dashboard). The site, the admin panel, and every text-based CMS feature
 *   must keep working in that state, so nothing here throws at module load and
 *   no code path assumes a store exists. `probeMedia()` reports the real state
 *   and every media route checks it first.
 */


const CF_API = "https://api.cloudflare.com/client/v4";

export const MEDIA_MAX_BYTES = 10 * 1024 * 1024; // 10MB

/** Extension per accepted type. SVG is intentionally absent: it can carry script. */
const EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif",
  "image/gif": "gif",
};

export const MEDIA_ACCEPTED = Object.keys(EXT);

// ---------------------------------------------------------------------------
// Validation — the client's Content-Type is advisory only; we sniff the bytes.
// ---------------------------------------------------------------------------
export function sniffMime(b: Uint8Array): string | null {
  const at = (i: number) => b[i] ?? -1;
  const ascii = (o: number, s: string) => s.split("").every((c, i) => at(o + i) === c.charCodeAt(0));

  if (at(0) === 0xff && at(1) === 0xd8 && at(2) === 0xff) return "image/jpeg";
  if (at(0) === 0x89 && ascii(1, "PNG")) return "image/png";
  if (ascii(0, "GIF8")) return "image/gif";
  if (ascii(0, "RIFF") && ascii(8, "WEBP")) return "image/webp";
  // AVIF/HEIF: "ftyp" box at offset 4, brand at offset 8.
  if (ascii(4, "ftyp") && (ascii(8, "avif") || ascii(8, "avis") || ascii(8, "mif1"))) return "image/avif";
  return null;
}

export function extFor(mime: string): string {
  return EXT[mime] ?? "bin";
}

// ---------------------------------------------------------------------------
// Intrinsic dimensions, parsed from the file header. Done server-side so the
// values cannot be spoofed and so `<img width height>` can prevent layout shift.
// ---------------------------------------------------------------------------
export function imageSize(b: Uint8Array, mime: string): { width: number; height: number } {
  const none = { width: 0, height: 0 };
  const u16 = (o: number) => (b[o] << 8) | b[o + 1];
  const u32 = (o: number) => ((b[o] << 24) | (b[o + 1] << 16) | (b[o + 2] << 8) | b[o + 3]) >>> 0;
  try {
    if (mime === "image/png") return { width: u32(16), height: u32(20) };
    if (mime === "image/gif") return { width: b[6] | (b[7] << 8), height: b[8] | (b[9] << 8) };
    if (mime === "image/webp") {
      const fmt = String.fromCharCode(b[12], b[13], b[14], b[15]);
      if (fmt === "VP8X") return { width: 1 + (b[24] | (b[25] << 8) | (b[26] << 16)), height: 1 + (b[27] | (b[28] << 8) | (b[29] << 16)) };
      if (fmt === "VP8 ") return { width: (b[26] | (b[27] << 8)) & 0x3fff, height: (b[28] | (b[29] << 8)) & 0x3fff };
      if (fmt === "VP8L") {
        const n = u32(21);
        const bits = ((b[21] | (b[22] << 8) | (b[23] << 16) | (b[24] << 24)) >>> 0);
        void n;
        return { width: (bits & 0x3fff) + 1, height: ((bits >> 14) & 0x3fff) + 1 };
      }
      return none;
    }
    if (mime === "image/jpeg") {
      let o = 2;
      while (o + 9 < b.length) {
        if (b[o] !== 0xff) { o++; continue; }
        const m = b[o + 1];
        // SOF0..SOF3, SOF5..SOF7, SOF9..SOF11, SOF13..SOF15 carry the frame size.
        if (m >= 0xc0 && m <= 0xcf && m !== 0xc4 && m !== 0xc8 && m !== 0xcc)
          return { width: u16(o + 7), height: u16(o + 5) };
        o += 2 + u16(o + 2);
      }
      return none;
    }
  } catch { /* malformed header — fall through */ }
  return none;
}

// ---------------------------------------------------------------------------
// Object keys: uploads/YYYY/MM/<uuid>-<sanitized>.<ext>
// Unique (uuid), sorted/cleanable by date, and never built from raw user input.
// ---------------------------------------------------------------------------
export function buildKey(mime: string, originalName: string): string {
  const now = new Date();
  const y = now.getUTCFullYear();
  const m = String(now.getUTCMonth() + 1).padStart(2, "0");
  const base = (originalName.replace(/\.[^.]+$/, "") || "image")
    .normalize("NFKD")
    .replace(/[^a-zA-Z0-9\u0600-\u06FF]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40) || "image";
  return `uploads/${y}/${m}/${crypto.randomUUID()}-${base}.${extFor(mime)}`;
}

/** Keys we generate never contain "..", a leading slash, or control characters. */
export function safeKey(key: string): boolean {
  return /^uploads\/\d{4}\/\d{2}\/[^/\s]+$/.test(key) && !key.includes("..");
}

// ---------------------------------------------------------------------------
// MediaStore — one interface over the R2 binding and the R2 REST API.
// ---------------------------------------------------------------------------
export interface StoredObject { body: ReadableStream | ArrayBuffer; contentType: string; size: number; etag?: string }

export interface MediaStore {
  mode: "binding" | "rest";
  put(key: string, bytes: ArrayBuffer, contentType: string, meta?: Record<string, string>): Promise<void>;
  get(key: string): Promise<StoredObject | null>;
  delete(key: string): Promise<void>;
}

interface R2ObjectBodyLike { body: ReadableStream; size: number; httpEtag: string; httpMetadata?: { contentType?: string } }
export interface R2BucketLike {
  put(key: string, value: ArrayBuffer, opts?: { httpMetadata?: { contentType?: string; cacheControl?: string }; customMetadata?: Record<string, string> }): Promise<unknown>;
  get(key: string): Promise<R2ObjectBodyLike | null>;
  delete(key: string): Promise<void>;
}

class BindingStore implements MediaStore {
  mode = "binding" as const;
  constructor(private bucket: R2BucketLike) {}
  async put(key: string, bytes: ArrayBuffer, contentType: string, meta?: Record<string, string>) {
    await this.bucket.put(key, bytes, {
      httpMetadata: { contentType, cacheControl: "public, max-age=31536000, immutable" },
      customMetadata: meta,
    });
  }
  async get(key: string) {
    const o = await this.bucket.get(key);
    return o ? { body: o.body, contentType: o.httpMetadata?.contentType || "application/octet-stream", size: o.size, etag: o.httpEtag } : null;
  }
  async delete(key: string) { await this.bucket.delete(key); }
}

class RestStore implements MediaStore {
  mode = "rest" as const;
  constructor(private token: string, private accountId: string, private bucket: string) {}
  private url(key: string) {
    // Each path segment is encoded individually so "/" stays a separator.
    const enc = key.split("/").map(encodeURIComponent).join("/");
    return `${CF_API}/accounts/${this.accountId}/r2/buckets/${encodeURIComponent(this.bucket)}/objects/${enc}`;
  }
  async put(key: string, bytes: ArrayBuffer, contentType: string) {
    const res = await fetch(this.url(key), {
      method: "PUT",
      headers: { Authorization: `Bearer ${this.token}`, "Content-Type": contentType },
      body: bytes,
    });
    if (!res.ok) {
      const b = await res.json().catch(() => null) as { errors?: { message?: string }[] } | null;
      throw new Error(`R2 REST put: ${b?.errors?.[0]?.message || `HTTP ${res.status}`}`);
    }
  }
  async get(key: string) {
    const res = await fetch(this.url(key), { headers: { Authorization: `Bearer ${this.token}` } });
    if (!res.ok) return null;
    const buf = await res.arrayBuffer();
    return { body: buf, contentType: res.headers.get("Content-Type") || "application/octet-stream", size: buf.byteLength };
  }
  async delete(key: string) {
    const res = await fetch(this.url(key), { method: "DELETE", headers: { Authorization: `Bearer ${this.token}` } });
    if (!res.ok && res.status !== 404) throw new Error(`R2 REST delete: HTTP ${res.status}`);
  }
}

export interface MediaEnv {
  MEDIA?: R2BucketLike; CF_API_TOKEN?: string; CF_ACCOUNT_ID?: string; CF_R2_BUCKET?: string;
}

export function getStore(env: MediaEnv, defaultBucket: string): MediaStore | null {
  if (env.MEDIA) return new BindingStore(env.MEDIA);
  if (env.CF_API_TOKEN && env.CF_ACCOUNT_ID)
    return new RestStore(env.CF_API_TOKEN, env.CF_ACCOUNT_ID, env.CF_R2_BUCKET || defaultBucket);
  return null;
}

// ---------------------------------------------------------------------------
// CAPABILITY DETECTION
//
// Media is optional. Instead of assuming R2 works because some config exists,
// we ask the real storage path and cache the answer. Callers get one plain
// object and never have to interpret Cloudflare error codes themselves.
// ---------------------------------------------------------------------------

/** Cloudflare returns this when the account has never enabled R2. */
export const R2_NOT_ENABLED_CODE = 10042;

export type MediaMode = "r2" | "disabled";

/** Why media is off. Drives the exact Persian sentence shown to the owner. */
export type MediaReason =
  | "ok"
  | "not_configured"   // no binding and no credentials yet — setup not finished
  | "r2_not_enabled"   // account-level R2 switch is off (code 10042)
  | "no_permission"    // token lacks "Workers R2 Storage: Edit"
  | "bucket_missing"   // R2 is on, but our bucket is not there
  | "unreachable";     // network/5xx — transient

export interface MediaCapability {
  /** True only when an upload would actually be accepted. */
  available: boolean;
  mode: MediaMode;
  /** Present when available, for diagnostics: which path is in use. */
  storage: "binding" | "rest" | "none";
  reason: MediaReason;
  /** Stable machine code for API responses. */
  code: "MEDIA_OK" | "MEDIA_NOT_CONFIGURED" | "R2_NOT_ENABLED" | "MEDIA_UNAVAILABLE";
}

const CAP_OK: (s: "binding" | "rest") => MediaCapability = (s) => ({
  available: true, mode: "r2", storage: s, reason: "ok", code: "MEDIA_OK",
});

function capOff(reason: Exclude<MediaReason, "ok">): MediaCapability {
  const code = reason === "not_configured" ? "MEDIA_NOT_CONFIGURED"
    : reason === "r2_not_enabled" ? "R2_NOT_ENABLED"
    : "MEDIA_UNAVAILABLE";
  return { available: false, mode: "disabled", storage: "none", reason, code };
}

/** Recognises the "R2 is switched off for this account" answer in any shape. */
export function isR2NotEnabled(body: unknown, status?: number): boolean {
  const errs = (body as { errors?: { code?: number; message?: string }[] } | null)?.errors ?? [];
  if (errs.some((e) => e.code === R2_NOT_ENABLED_CODE)) return true;
  if (errs.some((e) => /enable r2/i.test(e.message ?? ""))) return true;
  // Some gateways answer 402/423 for an unentitled product with no body.
  return status === 402 || status === 423;
}

/**
 * One probe result per isolate, kept briefly. Uploads are rare and a stale
 * "unavailable" must not stick around after the owner enables R2, so the TTL is
 * short and a successful retry clears it immediately.
 */
let probeCache: { at: number; cap: MediaCapability } | null = null;
const PROBE_TTL = 60_000;

export function clearMediaProbe() { probeCache = null; }

/**
 * Answers "can we store an image right now?" without ever throwing.
 *
 * Binding path: a `get()` on a key that cannot exist. It returns null when the
 * bucket is wired up and throws when the binding is broken — cheap either way.
 * REST path: a bucket lookup, which is also where code 10042 surfaces.
 */
export async function probeMedia(env: MediaEnv, defaultBucket: string, force = false): Promise<MediaCapability> {
  if (!force && probeCache && Date.now() - probeCache.at < PROBE_TTL) return probeCache.cap;

  const cap = await runProbe(env, defaultBucket);
  probeCache = { at: Date.now(), cap };
  return cap;
}

async function runProbe(env: MediaEnv, defaultBucket: string): Promise<MediaCapability> {
  if (env.MEDIA) {
    try {
      await env.MEDIA.get("__printopia_probe__");
      return CAP_OK("binding");
    } catch (e) {
      console.warn("[printopia] R2 binding probe failed:", (e as Error)?.message);
      // Fall through: the REST path may still work.
    }
  }

  if (!env.CF_API_TOKEN || !env.CF_ACCOUNT_ID) return capOff("not_configured");

  const bucket = env.CF_R2_BUCKET || defaultBucket;
  try {
    const res = await fetch(
      `${CF_API}/accounts/${env.CF_ACCOUNT_ID}/r2/buckets/${encodeURIComponent(bucket)}`,
      { headers: { Authorization: `Bearer ${env.CF_API_TOKEN}` } },
    );
    if (res.ok) return CAP_OK("rest");

    const body = await res.json().catch(() => null);
    if (isR2NotEnabled(body, res.status)) return capOff("r2_not_enabled");
    if (res.status === 403) return capOff("no_permission");
    if (res.status === 404) return capOff("bucket_missing");
    return capOff("unreachable");
  } catch (e) {
    console.warn("[printopia] R2 REST probe failed:", (e as Error)?.message);
    return capOff("unreachable");
  }
}

/** Plain-Persian explanation for the admin UI. No Cloudflare jargon. */
export function mediaReasonMessage(reason: MediaReason): string {
  switch (reason) {
    case "ok":
      return "ذخیره‌سازی تصویر فعال است.";
    case "r2_not_enabled":
      return "ذخیره‌سازی تصویر هنوز فعال نشده است. سایت و پنل مدیریت کار می‌کنند، اما تا فعال‌شدن آن در حساب Cloudflare نمی‌توانید تصویر بارگذاری کنید.";
    case "no_permission":
      return "ذخیره‌سازی تصویر فعال نیست چون توکن شما اجازهٔ دسترسی به آن را ندارد. توکن تازه‌ای با دسترسی تصاویر بسازید و دوباره تلاش کنید.";
    case "bucket_missing":
      return "فضای تصاویر ساخته نشده است. روی «تلاش دوباره برای فعال‌سازی تصاویر» بزنید تا ساخته شود.";
    case "not_configured":
      return "ذخیره‌سازی تصویر هنوز پیکربندی نشده است. ابتدا راه‌اندازی Cloudflare را کامل کنید.";
    case "unreachable":
    default:
      return "ارتباط با ذخیره‌سازی تصویر برقرار نشد. کمی بعد روی «بررسی دوباره» بزنید.";
  }
}


// ---------------------------------------------------------------------------
// URL strategy
// ---------------------------------------------------------------------------
/**
 * Same-origin `/media/<key>` by default. `base` (optional, from app_config
 * `media_base_url`) lets an R2 custom domain take over without touching stored
 * rows, because only the key is persisted — never a baked-in absolute URL.
 */
export function mediaUrl(key: string, base?: string | null): string {
  const path = key.split("/").map(encodeURIComponent).join("/");
  if (base) return `${base.replace(/\/$/, "")}/${path}`;
  return `/media/${path}`;
}

export interface MediaRow {
  id: string; object_key: string; original_filename?: string; mime_type: string;
  size_bytes: number; width?: number; height?: number; alt_text?: string;
  created_at: string; created_by?: string;
}

/** Shape returned to the admin UI. `url` is derived, never stored. */
export function toMediaDto(r: MediaRow, base?: string | null) {
  return {
    id: r.id,
    objectKey: r.object_key,
    url: mediaUrl(r.object_key, base),
    name: r.original_filename || r.object_key.split("/").pop() || "image",
    alt: r.alt_text || "",
    mimeType: r.mime_type,
    size: Number(r.size_bytes) || 0,
    width: Number(r.width) || 0,
    height: Number(r.height) || 0,
    createdAt: r.created_at,
  };
}
