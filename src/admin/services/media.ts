import type { AdminMedia } from "../types";

// ---------------------------------------------------------------------------
// MediaService — abstracted so the storage backend can change later
// (localStorage data URLs now; Cloudflare R2 later) without touching the UI.
// ---------------------------------------------------------------------------

const MAX_BYTES = 3 * 1024 * 1024; // 3MB — keep the repo / browser light
const ACCEPTED = ["image/webp", "image/avif", "image/jpeg", "image/png"];

export class MediaError extends Error {}

export interface MediaService {
  upload(file: File, alt: string): Promise<AdminMedia>;
  list(): AdminMedia[];
  saveAll(items: AdminMedia[]): void;
  remove(id: string): void;
}

function safeName(original: string): string {
  const ext = (original.split(".").pop() || "").toLowerCase();
  const base = original
    .replace(/\.[^.]+$/, "")
    .normalize("NFKD")
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 32) || "image";
  const stamp = Date.now().toString(36);
  return ext ? `${base}-${stamp}.${ext}` : `${base}-${stamp}`;
}

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new MediaError("خواندن فایل ناموفق بود."));
    reader.readAsDataURL(file);
  });
}

function getDimensions(dataUrl: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = () => resolve({ width: 0, height: 0 });
    img.src = dataUrl;
  });
}

const KEY = "printopia-admin-media";

function read(): AdminMedia[] {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as AdminMedia[]) : [];
  } catch {
    return [];
  }
}

export const localMedia: MediaService = {
  async upload(file, alt) {
    if (!ACCEPTED.includes(file.type)) {
      throw new MediaError("فرمت پشتیبانی نمی‌شود. فقط WebP، AVIF، JPG یا PNG.");
    }
    if (file.size > MAX_BYTES) {
      throw new MediaError("حجم فایل زیاد است. حداکثر ۳ مگابایت.");
    }
    if (!alt.trim()) {
      throw new MediaError("متن جایگزین (alt) تصویر الزامی است.");
    }
    const url = await readAsDataUrl(file);
    const dims = await getDimensions(url);
    const item: AdminMedia = {
      id: `m_${Date.now().toString(36)}`,
      name: safeName(file.name),
      url,
      alt: alt.trim(),
      size: file.size,
      width: dims.width,
      height: dims.height,
      createdAt: new Date().toISOString(),
    };
    const all = [item, ...read()];
    try {
      localStorage.setItem(KEY, JSON.stringify(all));
    } catch {
      throw new MediaError("فضای ذخیره‌سازی مرورگر پر است. چند رسانه را حذف کنید.");
    }
    return item;
  },
  list: () => read(),
  saveAll: (items) => {
    try {
      localStorage.setItem(KEY, JSON.stringify(items));
    } catch {
      /* ignore */
    }
  },
  remove: (id) => {
    try {
      localStorage.setItem(KEY, JSON.stringify(read().filter((m) => m.id !== id)));
    } catch {
      /* ignore */
    }
  },
};
