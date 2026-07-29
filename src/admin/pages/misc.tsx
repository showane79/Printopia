import { useState } from "react";
import { useStore } from "@/context/StoreContext";
import { localRepository } from "../services/repository";
import { localMedia, MediaError } from "../services/media";
import { Field, PageHeader, StatusPill } from "../ui";
import { generateSitemap } from "../lib/publicContent";
import { Check, Plus, Trash, Upload } from "@/components/icons";
import type { AdminCategory, AdminPage, AdminSettings } from "../types";

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

/* ----------------------------- Categories ----------------------------- */
export function Categories() {
  const { pushToast } = useStore();
  const [items, setItems] = useState<AdminCategory[]>(() => localRepository.listCategories());

  function update(id: string, patch: Partial<AdminCategory>) {
    setItems((arr) => arr.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  }
  function add() {
    setItems((arr) => [...arr, { id: `cat_${Date.now().toString(36)}`, name: "دستهٔ جدید", slug: "" }]);
  }
  function remove(id: string) {
    setItems((arr) => arr.filter((c) => c.id !== id));
  }
  function save() {
    const cleaned = items.map((c) => ({ ...c, slug: c.slug || slugifyFa(c.name) || c.id }));
    localRepository.saveCategories(cleaned);
    setItems(cleaned);
    pushToast("دسته‌بندی‌ها ذخیره شدند.");
  }

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

  function open(key: string) {
    const existing = localRepository.getPage(key);
    const meta = PAGE_KEYS.find((p) => p.key === key)!;
    setDraft(existing ?? { id: `page_${key}`, key, title: meta.title, intro: "", body: [], status: "draft", updatedAt: new Date().toISOString() });
    setSelected(key);
  }
  function save() {
    if (!draft) return;
    const next = { ...draft, updatedAt: new Date().toISOString() };
    localRepository.savePage(next);
    pushToast("صفحه ذخیره شد.");
    setSelected(null);
  }

  return (
    <div>
      <PageHeader title="صفحات سایت" subtitle="محتوای صفحات ثابت را ویرایش کنید" />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {PAGE_KEYS.map((p) => {
          const existing = localRepository.getPage(p.key);
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

export function Media() {
  const { pushToast } = useStore();
  const [, setTick] = useState(0);
  const refresh = () => setTick((t) => t + 1);
  const [alt, setAlt] = useState("");
  const [busy, setBusy] = useState(false);

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
      await localMedia.upload(file, alt);
      setAlt("");
      pushToast("رسانه بارگذاری شد.");
    } catch (err) {
      pushToast(err instanceof MediaError ? err.message : "بارگذاری ناموفق بود.", "error");
    } finally {
      setBusy(false);
      refresh();
    }
  }
  function remove(id: string) {
    localMedia.remove(id);
    refresh();
    pushToast("رسانه حذف شد.", "info");
  }
  function copy(url: string) {
    navigator.clipboard?.writeText(url).then(() => pushToast("آدرس کپی شد."));
  }

  const media = localMedia.list();

  return (
    <div>
      <PageHeader title="رسانه‌ها" subtitle="تصویرها برای مقاله‌ها و صفحات" />

      <div className="card mb-5 p-4">
        <Field label="متن جایگزین (الزامی)" htmlFor="alt" hint="توضیح تصویر؛ قبل از انتخاب فایل بنویسید.">
          <input id="alt" className="input" value={alt} onChange={(e) => setAlt(e.target.value)} placeholder="مثلاً: اکشن فیگور چاپ سه‌بعدی" />
        </Field>
        <label className="mt-3 flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-line bg-surface2 px-4 py-6 text-sm text-muted transition hover:border-accent hover:text-accent">
          <Upload className="h-5 w-5" />
          {busy ? "در حال بارگذاری..." : "انتخاب تصویر (WebP، AVIF، JPG، PNG — حداکثر ۳ مگابایت)"}
          <input type="file" className="sr-only" accept="image/webp,image/avif,image/jpeg,image/png" onChange={onFile} disabled={busy} />
        </label>
      </div>

      {media.length === 0 ? (
        <div className="card p-10 text-center text-sm text-muted">هنوز رسانه‌ای بارگذاری نشده.</div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {media.map((m) => (
            <div key={m.id} className="card overflow-hidden">
              <img src={m.url} alt={m.alt} className="aspect-video w-full object-cover" />
              <div className="p-3">
                <p className="truncate text-xs font-bold">{m.alt}</p>
                <p className="text-[11px] text-muted">{formatBytes(m.size)}</p>
                <div className="mt-2 flex gap-1">
                  <button onClick={() => copy(m.url)} className="btn btn-secondary flex-1 px-2 py-1.5 text-xs">کپی آدرس</button>
                  <button onClick={() => remove(m.id)} aria-label="حذف" className="grid h-8 w-8 place-items-center rounded-lg border border-line text-danger hover:border-danger">
                    <Trash className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ----------------------------- Settings ----------------------------- */
export function Settings() {
  const { pushToast } = useStore();
  const [s, setS] = useState<AdminSettings>(() => localRepository.getSettings());

  function set<K extends keyof AdminSettings>(k: K, v: AdminSettings[K]) {
    setS((prev) => ({ ...prev, [k]: v }));
  }
  function save() {
    localRepository.saveSettings(s);
    pushToast("تنظیمات ذخیره شد و در سایت اعمال شد.");
  }
  function downloadSitemap() {
    const xml = generateSitemap();
    const blob = new Blob([xml], { type: "application/xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "sitemap.xml";
    a.click();
    URL.revokeObjectURL(url);
  }

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
