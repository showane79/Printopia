import { useCallback, useEffect, useState } from "react";
import { useStore } from "@/context/StoreContext";
import { serverRepository } from "../services/repository";
import {
  ACCEPT_ATTR,
  MediaError,
  deleteMedia,
  listMedia,
  updateMediaAlt,
  uploadMedia,
} from "../services/media";
import { Field, PageHeader, StatusPill, ConfirmDialog } from "../ui";

import { generateSitemap } from "../lib/publicContent";
import { Check, Plus, Trash, Upload } from "@/components/icons";
import type { AdminCategory, AdminMedia, AdminPage, AdminSettings } from "../types";


const PAGE_KEYS: { key: string; title: string }[] = [
  { key: "about", title: "درباره ما" },
  { key: "contact", title: "تماس با ما" },
  { key: "terms", title: "قوانین و شرایط استفاده" },
  { key: "privacy", title: "حریم خصوصی" },
  { key: "shipping", title: "ارسال و مرجوعی" },
  { key: "faq", title: "سؤالات متداول" },
];

function slugifyFa(s: string) {
  return s.trim().replace(/\s+/g, "-").toLowerCase();
}

function Loading() {
  return (
    <div className="card p-8 text-center text-sm text-muted" aria-busy="true">
      <span className="mx-auto block h-6 w-6 animate-spin rounded-full border-2 border-accent border-t-transparent" />
      <p className="mt-3">در حال بارگذاری…</p>
    </div>
  );
}

/* ----------------------------- Categories ----------------------------- */
export function Categories() {
  const { pushToast } = useStore();
  const [items, setItems] = useState<AdminCategory[] | null>(null);

  useEffect(() => {
    let alive = true;
    serverRepository
      .listCategories()
      .then((c) => alive && setItems(c))
      .catch(() => alive && setItems([]));
    return () => {
      alive = false;
    };
  }, []);

  function update(id: string, patch: Partial<AdminCategory>) {
    setItems((arr) => (arr ?? []).map((c) => (c.id === id ? { ...c, ...patch } : c)));
  }
  function add() {
    setItems((arr) => [...(arr ?? []), { id: `cat_${Date.now().toString(36)}`, name: "دستهٔ جدید", slug: "" }]);
  }
  function remove(id: string) {
    setItems((arr) => (arr ?? []).filter((c) => c.id !== id));
  }
  async function save() {
    if (!items) return;
    const cleaned = items.map((c) => ({ ...c, slug: c.slug || slugifyFa(c.name) || c.id }));
    try {
      await serverRepository.saveCategories(cleaned);
      setItems(cleaned);
      pushToast("دسته‌بندی‌ها ذخیره شدند.");
    } catch {
      pushToast("ذخیره ناموفق بود؛ اتصال سرور را بررسی کنید.", "error");
    }
  }

  if (!items) return <Loading />;

  return (
    <div>
      <PageHeader title="دسته‌بندی‌ها" subtitle="دسته‌بندی‌های مقاله‌ها را مدیریت کنید" action={<button onClick={save} className="btn btn-primary">ذخیره تغییرات</button>} />
      <div className="card divide-y divide-line">
        {items.map((c) => (
          <div key={c.id} className="flex flex-wrap items-center gap-2 p-3">
            <input className="input flex-1" value={c.name} onChange={(e) => update(c.id, { name: e.target.value })} aria-label="نام" />
            <input className="input w-40" dir="ltr" value={c.slug} onChange={(e) => update(c.id, { slug: e.target.value })} aria-label="اسلاگ" placeholder="slug" />
            <button onClick={() => remove(c.id)} aria-label="حذف" className="grid h-10 w-10 place-items-center rounded-lg border border-line text-danger hover:border-danger">
              <Trash className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
      <button onClick={add} className="btn btn-secondary mt-3 text-sm">
        <Plus className="h-4 w-4" /> افزودن دسته
      </button>
    </div>
  );
}

/* ----------------------------- Pages ----------------------------- */
export function PagesManager() {
  const { pushToast } = useStore();
  const [selected, setSelected] = useState<string | null>(null);
  const [draft, setDraft] = useState<AdminPage | null>(null);
  const [pages, setPages] = useState<AdminPage[] | null>(null);

  const reload = useCallback(async () => {
    try {
      setPages(await serverRepository.listPages());
    } catch {
      setPages([]);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  function open(key: string) {
    const existing = (pages ?? []).find((p) => p.key === key);
    const meta = PAGE_KEYS.find((p) => p.key === key)!;
    setDraft(existing ?? { id: `page_${key}`, key, title: meta.title, intro: "", body: [], status: "draft", updatedAt: new Date().toISOString() });
    setSelected(key);
  }
  async function save() {
    if (!draft) return;
    const next = { ...draft, updatedAt: new Date().toISOString() };
    try {
      await serverRepository.savePage(next);
      await reload();
      pushToast("صفحه ذخیره شد.");
      setSelected(null);
    } catch {
      pushToast("ذخیره ناموفق بود؛ اتصال سرور را بررسی کنید.", "error");
    }
  }

  if (!pages) return <Loading />;

  return (
    <div>
      <PageHeader title="صفحات سایت" subtitle="محتوای صفحات ثابت را ویرایش کنید" />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {PAGE_KEYS.map((p) => {
          const existing = pages.find((x) => x.key === p.key);
          return (
            <button key={p.key} onClick={() => open(p.key)} className="card p-5 text-start hover:border-accent">
              <div className="flex items-center justify-between">
                <span className="font-bold">{p.title}</span>
                {existing && <StatusPill status={existing.status} />}
              </div>
              <p className="mt-1 text-xs text-muted">{existing ? "ویرایش شده" : "بدون ویرایش"}</p>
            </button>
          );
        })}
      </div>

      {selected && draft && (
        <div className="card mt-6 p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-extrabold">ویرایش: {PAGE_KEYS.find((p) => p.key === selected)?.title}</h2>
            <button onClick={() => setSelected(null)} className="text-sm text-muted hover:text-fg">بستن</button>
          </div>
          <div className="flex flex-col gap-4">
            <Field label="عنوان صفحه" htmlFor="pt">
              <input id="pt" className="input" value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
            </Field>
            <Field label="مقدمه صفحه" htmlFor="pi">
              <textarea id="pi" className="input min-h-28 resize-y" value={draft.intro ?? ""} onChange={(e) => setDraft({ ...draft, intro: e.target.value })} />
            </Field>
            <Field label="وضعیت" htmlFor="ps">
              <select id="ps" className="input" value={draft.status} onChange={(e) => setDraft({ ...draft, status: e.target.value as AdminPage["status"] })}>
                <option value="draft">پیش‌نویس</option>
                <option value="published">منتشرشده</option>
                <option value="archived">بایگانی‌شده</option>
              </select>
            </Field>
            <div className="flex gap-2">
              <button onClick={save} className="btn btn-primary">ذخیره صفحه</button>
              <button onClick={() => setSelected(null)} className="btn btn-secondary">انصراف</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ----------------------------- Media ----------------------------- */
function formatBytes(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

/**
 * Media library. The list, the bytes, and the alt text all live on the server
 * (D1 + R2), so an upload from a phone shows up on a laptop after a refresh and
 * survives redeploys. Deletes are blocked while an image is still referenced,
 * unless the user confirms.
 */
export function Media() {
  const { pushToast } = useStore();
  const [media, setMedia] = useState<AdminMedia[] | null>(null);
  const [alt, setAlt] = useState("");
  const [busy, setBusy] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<{ item: AdminMedia; usedBy: string[] } | null>(null);

  const reload = useCallback(async () => {
    try {
      setMedia(await listMedia());
    } catch (err) {
      setMedia([]);
      pushToast(err instanceof MediaError ? err.message : "بارگذاری رسانه‌ها ناموفق بود.", "error");
    }
  }, [pushToast]);

  useEffect(() => {
    void reload();
  }, [reload]);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!alt.trim()) {
      pushToast("ابتدا متن جایگزین (alt) را بنویسید.", "error");
      return;
    }
    setBusy(true);
    try {
      const saved = await uploadMedia(file, alt);
      setMedia((arr) => [saved, ...(arr ?? [])]);
      setAlt("");
      pushToast("تصویر بارگذاری شد و در همهٔ دستگاه‌ها در دسترس است.");
    } catch (err) {
      pushToast(err instanceof MediaError ? err.message : "بارگذاری ناموفق بود.", "error");
    } finally {
      setBusy(false);
    }
  }

  /** First attempt is non-forced so the server can warn about references. */
  async function remove(item: AdminMedia, force = false) {
    try {
      await deleteMedia(item.id, force);
      setMedia((arr) => (arr ?? []).filter((m) => m.id !== item.id));
      pushToast("تصویر حذف شد.", "info");
      setPendingDelete(null);
    } catch (err) {
      if (err instanceof MediaError && err.code === "MEDIA_IN_USE") {
        setPendingDelete({ item, usedBy: err.usedBy ?? [] });
        return;
      }
      pushToast(err instanceof MediaError ? err.message : "حذف ناموفق بود.", "error");
      setPendingDelete(null);
    }
  }

  async function saveAlt(item: AdminMedia, next: string) {
    if (next === item.alt) return;
    try {
      const updated = await updateMediaAlt(item.id, next);
      setMedia((arr) => (arr ?? []).map((m) => (m.id === item.id ? updated : m)));
      pushToast("متن جایگزین ذخیره شد.");
    } catch (err) {
      pushToast(err instanceof MediaError ? err.message : "ذخیره ناموفق بود.", "error");
      void reload();
    }
  }

  function copy(url: string) {
    // Store the absolute URL so it can be pasted anywhere, not just in-app.
    const absolute = new URL(url, window.location.origin).toString();
    navigator.clipboard?.writeText(absolute).then(
      () => pushToast("آدرس کپی شد."),
      () => pushToast("کپی ناموفق بود.", "error")
    );
  }

  if (!media) return <Loading />;

  return (
    <div>
      <PageHeader title="رسانه‌ها" subtitle="تصویرها روی سرور ذخیره می‌شوند و در همهٔ دستگاه‌ها یکسان‌اند" />

      <div className="card mb-5 p-4">
        <Field label="متن جایگزین (الزامی)" htmlFor="alt" hint="توضیح تصویر؛ قبل از انتخاب فایل بنویسید.">
          <input id="alt" className="input" value={alt} onChange={(e) => setAlt(e.target.value)} placeholder="مثلاً: اکشن فیگور چاپ سه‌بعدی" />
        </Field>
        <label className="mt-3 flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-line bg-surface2 px-4 py-6 text-sm text-muted transition hover:border-accent hover:text-accent">
          <Upload className="h-5 w-5" />
          {busy ? "در حال بارگذاری…" : "انتخاب تصویر (WebP، AVIF، JPG، PNG، GIF — حداکثر ۱۰ مگابایت)"}
          <input type="file" className="sr-only" accept={ACCEPT_ATTR} onChange={onFile} disabled={busy} />
        </label>
      </div>

      {media.length === 0 ? (
        <div className="card p-10 text-center text-sm text-muted">هنوز تصویری بارگذاری نشده.</div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {media.map((m) => (
            <div key={m.id} className="card overflow-hidden">
              <img
                src={m.url}
                alt={m.alt}
                width={m.width || undefined}
                height={m.height || undefined}
                loading="lazy"
                decoding="async"
                className="aspect-video w-full bg-surface2 object-cover"
              />
              <div className="p-3">
                <input
                  className="input px-2 py-1 text-xs"
                  defaultValue={m.alt}
                  aria-label={`متن جایگزین ${m.name}`}
                  onBlur={(e) => void saveAlt(m, e.target.value.trim())}
                />
                <p className="mt-1 text-[11px] text-muted">
                  {formatBytes(m.size)}
                  {m.width && m.height ? ` · ${m.width}×${m.height}` : ""}
                </p>
                <div className="mt-2 flex gap-1">
                  <button onClick={() => copy(m.url)} className="btn btn-secondary flex-1 px-2 py-1.5 text-xs">کپی آدرس</button>
                  <button onClick={() => void remove(m)} aria-label={`حذف ${m.name}`} className="grid h-8 w-8 place-items-center rounded-lg border border-line text-danger hover:border-danger">
                    <Trash className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={!!pendingDelete}
        title="این تصویر در حال استفاده است"
        message={
          pendingDelete
            ? `این تصویر در ${pendingDelete.usedBy.join("، ") || "بخش‌هایی از سایت"} استفاده شده است. با حذف آن، تصویر در آن بخش‌ها نمایش داده نمی‌شود. حذف شود؟`
            : ""
        }
        confirmText="حذف کن"
        danger
        onConfirm={() => pendingDelete && void remove(pendingDelete.item, true)}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
}


/* ----------------------------- Settings ----------------------------- */
export function Settings() {
  const { pushToast } = useStore();
  const [s, setS] = useState<AdminSettings | null>(null);

  useEffect(() => {
    let alive = true;
    serverRepository
      .getSettings()
      .then((v) => alive && setS(v))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  function set<K extends keyof AdminSettings>(k: K, v: AdminSettings[K]) {
    setS((prev) => (prev ? { ...prev, [k]: v } : prev));
  }
  async function save() {
    if (!s) return;
    try {
      await serverRepository.saveSettings(s);
      pushToast("تنظیمات ذخیره شد و در سایت اعمال شد.");
    } catch {
      pushToast("ذخیره ناموفق بود؛ اتصال سرور را بررسی کنید.", "error");
    }
  }
  async function downloadSitemap() {
    try {
      const xml = await generateSitemap();
      const blob = new Blob([xml], { type: "application/xml" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "sitemap.xml";
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      pushToast("ساخت نقشهٔ سایت ناموفق بود.", "error");
    }
  }

  if (!s) return <Loading />;

  return (
    <div>
      <PageHeader title="تنظیمات" subtitle="اطلاعات اصلی سایت" action={<button onClick={save} className="btn btn-primary">ذخیره تنظیمات</button>} />
      <div className="card max-w-2xl p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="نام سایت" htmlFor="sn"><input id="sn" className="input" value={s.siteName} onChange={(e) => set("siteName", e.target.value)} /></Field>
          <Field label="شماره تماس" htmlFor="sph"><input id="sph" className="input" dir="ltr" value={s.phone} onChange={(e) => set("phone", e.target.value)} /></Field>
          <Field label="ایمیل" htmlFor="se"><input id="se" className="input" dir="ltr" value={s.email} onChange={(e) => set("email", e.target.value)} /></Field>
          <Field label="حداکثر ارسال رایگان (تومان)" htmlFor="sf"><input id="sf" type="number" className="input" dir="ltr" value={s.freeShippingThreshold} onChange={(e) => set("freeShippingThreshold", Number(e.target.value) || 0)} /></Field>
        </div>
        <div className="mt-4">
          <Field label="شعار سایت" htmlFor="st"><input id="st" className="input" value={s.tagline} onChange={(e) => set("tagline", e.target.value)} /></Field>
        </div>
      </div>

      <div className="card mt-5 max-w-2xl p-5">
        <p className="font-bold">نقشهٔ سایت (sitemap)</p>
        <p className="mt-1 text-sm text-muted">فایل sitemap.xml شامل مسیرهای اصلی و مقاله‌های منتشرشده.</p>
        <button onClick={downloadSitemap} className="btn btn-secondary mt-3">دانلود sitemap.xml</button>
      </div>

      <div className="card mt-5 max-w-2xl p-5">
        <p className="flex items-center gap-2 font-bold"><Check className="h-4 w-4 text-success" /> دربارهٔ امنیت</p>
        <p className="mt-1 text-sm leading-7 text-muted">
          در نسخهٔ استقراری، تأیید هویت، محافظت CSRF و انتشار به GitHub همگی در سمت سرور (Cloudflare Pages
          Functions) انجام می‌شوند. هیچ رمز یا توکنی در مرورگر قرار نمی‌گیرد.
        </p>
      </div>
    </div>
  );
}
