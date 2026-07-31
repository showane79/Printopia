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

export function getStore(env: {
  MEDIA?: R2BucketLike; CF_API_TOKEN?: string; CF_ACCOUNT_ID?: string; CF_R2_BUCKET?: string;
}, defaultBucket: string): MediaStore | null {
  if (env.MEDIA) return new BindingStore(env.MEDIA);
  if (env.CF_API_TOKEN && env.CF_ACCOUNT_ID)
    return new RestStore(env.CF_API_TOKEN, env.CF_ACCOUNT_ID, env.CF_R2_BUCKET || defaultBucket);
  return null;
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
