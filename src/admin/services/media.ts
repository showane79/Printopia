/**
 * MediaService — server-backed media client.
 *
 * Every byte lives in Cloudflare R2 and every record lives in D1, reached over
 * /api/admin/media*. Nothing is written to localStorage and no data URLs are
 * produced, so an image uploaded on one device is immediately visible on every
 * other device and survives refreshes and redeploys.
 *
 * (The previous implementation stored data URLs in localStorage. That could not
 * sync across devices and is fully removed.)
 */

import type { AdminMedia } from "../types";

/** Mirrors the server limit; the client check just gives a faster message. */
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
export const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/avif", "image/gif"];
export const ACCEPT_ATTR = ACCEPTED_TYPES.join(",");

export class MediaError extends Error {
  constructor(message: string, public code = "MEDIA_ERROR", public usedBy?: string[]) {
    super(message);
    this.name = "MediaError";
  }
}

interface MediaResponse {
  ok: boolean;
  code?: string;
  message?: string;
  media?: AdminMedia | AdminMedia[];
  usedBy?: string[];
  storage?: string;
  mediaAvailable?: boolean;
  mediaReason?: string;
  mediaMessage?: string;
}

/**
 * Whether image storage is usable right now, and if not, why — in a sentence
 * the site owner can act on. Image storage is optional: everything else in the
 * CMS works while `available` is false, so the UI explains instead of failing.
 */
export interface MediaStatus {
  available: boolean;
  reason: string;
  message: string;
  /** True when a retry could plausibly fix it (R2 just switched on, etc.). */
  retryable: boolean;
}

/** The library plus the capability that produced it, in one round trip. */
export interface MediaLibrary {
  items: AdminMedia[];
  status: MediaStatus;
}

const UNKNOWN_STATUS: MediaStatus = {
  available: false,
  reason: "unreachable",
  message: "وضعیت ذخیره‌سازی تصویر مشخص نشد. کمی بعد دوباره تلاش کنید.",
  retryable: true,
};

/** `not_configured` is the one state a retry cannot fix — setup must finish first. */
function toStatus(d: { mediaAvailable?: boolean; available?: boolean; mediaReason?: string; reason?: string; mediaMessage?: string; message?: string }): MediaStatus {
  const available = !!(d.mediaAvailable ?? d.available);
  const reason = d.mediaReason ?? d.reason ?? (available ? "ok" : "unreachable");
  return {
    available,
    reason,
    message: d.mediaMessage ?? d.message ?? "",
    retryable: !available && reason !== "not_configured",
  };
}


async function readError(res: Response): Promise<never> {
  const data = (await res.json().catch(() => ({}))) as MediaResponse;
  throw new MediaError(
    data.message || `خطای سرور (${res.status})`,
    data.code || "MEDIA_ERROR",
    data.usedBy
  );
}

/** Uploads one file. Validation is enforced server-side; this is a fast path. */
export async function uploadMedia(file: File, alt: string): Promise<AdminMedia> {
  if (!alt.trim()) throw new MediaError("متن جایگزین (alt) تصویر الزامی است.", "ALT_REQUIRED");
  if (file.size === 0) throw new MediaError("فایل خالی است.", "FILE_EMPTY");
  if (file.size > MAX_UPLOAD_BYTES)
    throw new MediaError("حجم فایل زیاد است. حداکثر ۱۰ مگابایت.", "FILE_TOO_LARGE");
  if (file.type && !ACCEPTED_TYPES.includes(file.type))
    throw new MediaError("فرمت پشتیبانی نمی‌شود. فقط JPG، PNG، WebP، AVIF یا GIF.", "UNSUPPORTED_TYPE");

  const form = new FormData();
  form.append("file", file);
  form.append("alt", alt.trim());

  let res: Response;
  try {
    // No Content-Type header on purpose: the browser must set the multipart boundary.
    res = await fetch("/api/admin/media/upload", { method: "POST", body: form });
  } catch {
    throw new MediaError("اتصال به سرور برقرار نشد. اینترنت را بررسی کنید.", "NETWORK");
  }
  if (!res.ok) await readError(res);

  const data = (await res.json()) as MediaResponse;
  if (!data.media) throw new MediaError("پاسخ سرور نامعتبر بود.", "BAD_RESPONSE");
  return data.media as AdminMedia;
}

/** The media library, straight from the server (shared across all devices). */
export async function listMedia(): Promise<AdminMedia[]> {
  return (await getMediaLibrary()).items;
}

/**
 * Library + capability in one request.
 *
 * Already-uploaded images stay listed even when storage is unavailable, so the
 * owner can still see and clean up what exists; only new uploads are blocked.
 */
export async function getMediaLibrary(): Promise<MediaLibrary> {
  let res: Response;
  try {
    res = await fetch("/api/admin/media");
  } catch {
    throw new MediaError("بارگذاری کتابخانهٔ رسانه ناموفق بود. اینترنت را بررسی کنید.", "NETWORK");
  }
  if (!res.ok) await readError(res);
  const data = (await res.json()) as MediaResponse;
  return { items: (data.media as AdminMedia[]) ?? [], status: toStatus(data) };
}

/** Capability only — cheap enough to call whenever an upload UI is shown. */
export async function getMediaStatus(refresh = false): Promise<MediaStatus> {
  try {
    const res = await fetch(`/api/admin/media/status${refresh ? "?refresh=1" : ""}`);
    if (!res.ok) return UNKNOWN_STATUS;
    return toStatus((await res.json()) as MediaResponse);
  } catch {
    return UNKNOWN_STATUS;
  }
}

/**
 * Asks the server to set image storage up again with the token already saved
 * during setup. This is the "I just enabled R2 in Cloudflare" path — no token
 * re-entry and no full re-run of setup.
 */
export async function retryMediaSetup(): Promise<MediaStatus> {
  let res: Response;
  try {
    res = await fetch("/api/admin/media/retry", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{}",
    });
  } catch {
    throw new MediaError("اتصال به سرور برقرار نشد. اینترنت را بررسی کنید.", "NETWORK");
  }
  const data = (await res.json().catch(() => ({}))) as MediaResponse;
  // A failed retry is a real answer, not an exception: it carries the reason.
  return toStatus(data);
}


/** Updates the alt text. The URL never changes, so nothing else breaks. */
export async function updateMediaAlt(id: string, alt: string): Promise<AdminMedia> {
  const res = await fetch(`/api/admin/media/${encodeURIComponent(id)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ alt }),
  });
  if (!res.ok) await readError(res);
  return ((await res.json()) as MediaResponse).media as AdminMedia;
}

/**
 * Deletes an image. The server refuses with MEDIA_IN_USE (409) while the file is
 * still referenced by a post, product, or setting; pass force to override once
 * the user has confirmed.
 */
export async function deleteMedia(id: string, force = false): Promise<void> {
  const res = await fetch(`/api/admin/media/${encodeURIComponent(id)}${force ? "?force=1" : ""}`, {
    method: "DELETE",
  });
  if (!res.ok) await readError(res);
}
