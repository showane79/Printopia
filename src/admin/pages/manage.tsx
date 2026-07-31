import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  getAppearance,
  getSeo,
  listNav,
  listRedirects,
  serverRepository,
  saveAppearance,
  saveNav,
  saveRedirects,
  saveSeo,
} from "../services/repository";
import { useStore } from "@/context/StoreContext";
import { generateSitemap } from "../lib/publicContent";
import { Field, PageHeader } from "../ui";
import { Plus, Trash } from "@/components/icons";
import { toPersianDigits } from "@/utils/format";
import type {
  AdminAppearance,
  AdminCategory,
  AdminNavItem,
  AdminRedirect,
  AdminSeo,
  AdminSettings,
} from "../types";

/**
 * Loads server-backed state once on mount. Stays `null` while in flight so
 * forms can show a placeholder instead of binding to undefined fields.
 */
function useServerState<T>(
  load: () => Promise<T>,
): [T | null, React.Dispatch<React.SetStateAction<T | null>>, boolean] {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    load()
      .then((d) => {
        if (alive) setData(d);
      })
      .catch(() => {
        if (alive) setData(null);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return [data, setData, loading];
}

function Loading() {
  return (
    <div className="card p-8 text-center text-sm text-muted" aria-busy="true">
      <span className="mx-auto block h-6 w-6 animate-spin rounded-full border-2 border-accent border-t-transparent" />
      <p className="mt-3">در حال بارگذاری…</p>
    </div>
  );
}

/* ----------------------------- Navigation ----------------------------- */
export function Navigation() {
  const { pushToast } = useStore();
  const [items, setItems, loading] = useServerState<AdminNavItem[]>(listNav);

  function update(i: number, patch: Partial<AdminNavItem>) {
    setItems((arr) => (arr ?? []).map((it, idx) => (idx === i ? { ...it, ...patch } : it)));
  }
  function move(i: number, dir: -1 | 1) {
    setItems((arr) => {
      if (!arr) return arr;
      const next = [...arr];
      const j = i + dir;
      if (j < 0 || j >= next.length) return arr;
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  }
  function add() {
    setItems((arr) => [...(arr ?? []), { label: "مورد جدید", to: "/", visible: true }]);
  }
  function remove(i: number) {
    setItems((arr) => (arr ?? []).filter((_, idx) => idx !== i));
  }
  async function save() {
    if (!items) return;
    try {
      await saveNav(items);
      pushToast("منوها ذخیره شدند.");
    } catch {
      pushToast("ذخیره ناموفق بود؛ اتصال سرور را بررسی کنید.", "error");
    }
  }

  if (loading || !items) return <Loading />;

  return (
    <div>
      <PageHeader title="منوها و ناوبری" subtitle="برچسب‌ها، آدرس‌ها، ترتیب و نمایش آیتم‌های منو" action={<button onClick={save} className="btn btn-primary">ذخیره تغییرات</button>} />
      <div className="card divide-y divide-line">
        {items.map((it, i) => (
          <div key={i} className="flex flex-wrap items-center gap-2 p-3">
            <div className="flex flex-col">
              <button onClick={() => move(i, -1)} disabled={i === 0} aria-label="بالا" className="grid h-8 w-8 place-items-center rounded-lg border border-line disabled:opacity-30">▲</button>
              <button onClick={() => move(i, 1)} disabled={i === items.length - 1} aria-label="پایین" className="mt-1 grid h-8 w-8 place-items-center rounded-lg border border-line disabled:opacity-30">▼</button>
            </div>
            <input className="input flex-1" value={it.label} onChange={(e) => update(i, { label: e.target.value })} aria-label="برچسب" />
            <input className="input w-40" dir="ltr" value={it.to} onChange={(e) => update(i, { to: e.target.value })} aria-label="آدرس" />
            <label className="flex w-28 items-center gap-2 text-sm font-bold">
              <input type="checkbox" className="h-5 w-5 accent-[var(--c-accent)]" checked={it.visible} onChange={(e) => update(i, { visible: e.target.checked })} />
              نمایش
            </label>
            <button onClick={() => remove(i)} aria-label="حذف" className="grid h-10 w-10 place-items-center rounded-lg border border-line text-danger hover:border-danger">
              <Trash className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
      <button onClick={add} className="btn btn-secondary mt-3 text-sm"><Plus className="h-4 w-4" /> افزودن آیتم</button>
    </div>
  );
}

/* ----------------------------- Appearance ----------------------------- */
export function Appearance() {
  const { pushToast } = useStore();
  const [a, setA, loading] = useServerState<AdminAppearance>(getAppearance);
  function set<K extends keyof AdminAppearance>(k: K, v: AdminAppearance[K]) {
    setA((p) => (p ? { ...p, [k]: v } : p));
  }
  async function save() {
    if (!a) return;
    try {
      await saveAppearance(a);
      pushToast("ظاهر سایت ذخیره شد.");
    } catch {
      pushToast("ذخیره ناموفق بود؛ اتصال سرور را بررسی کنید.", "error");
    }
  }

  if (loading || !a) return <Loading />;

  return (
    <div>
      <PageHeader title="ظاهر سایت" subtitle="رنگ‌ها، تم پیش‌فرض و شبکه‌های اجتماعی" action={<button onClick={save} className="btn btn-primary">ذخیره</button>} />
      <div className="card max-w-2xl p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="نام فروشگاه" htmlFor="an"><input id="an" className="input" value={a.storeName} onChange={(e) => set("storeName", e.target.value)} /></Field>
          <Field label="تم پیش‌فرض" htmlFor="at">
            <select id="at" className="input" value={a.defaultTheme} onChange={(e) => set("defaultTheme", e.target.value as "dark" | "light")}>
              <option value="dark">تیره</option>
              <option value="light">روشن</option>
            </select>
          </Field>
          <Field label="رنگ اصلی" htmlFor="ac">
            <div className="flex items-center gap-2">
              <input id="ac" type="color" className="h-10 w-12 rounded-lg border border-line bg-surface2" value={a.accent} onChange={(e) => set("accent", e.target.value)} />
              <input dir="ltr" className="input flex-1" value={a.accent} onChange={(e) => set("accent", e.target.value)} />
            </div>
          </Field>
          <Field label="رنگ دوم" htmlFor="ac2">
            <div className="flex items-center gap-2">
              <input id="ac2" type="color" className="h-10 w-12 rounded-lg border border-line bg-surface2" value={a.accent2} onChange={(e) => set("accent2", e.target.value)} />
              <input dir="ltr" className="input flex-1" value={a.accent2} onChange={(e) => set("accent2", e.target.value)} />
            </div>
          </Field>
        </div>
        <div className="mt-4 border-t border-line pt-4">
          <p className="mb-2 text-sm font-bold">شبکه‌های اجتماعی</p>
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="اینستاگرام" htmlFor="ig"><input id="ig" dir="ltr" className="input text-start" value={a.social.instagram} onChange={(e) => set("social", { ...a.social, instagram: e.target.value })} /></Field>
            <Field label="تلگرام" htmlFor="tg"><input id="tg" dir="ltr" className="input text-start" value={a.social.telegram} onChange={(e) => set("social", { ...a.social, telegram: e.target.value })} /></Field>
            <Field label="واتساپ" htmlFor="wa"><input id="wa" dir="ltr" className="input text-start" value={a.social.whatsapp} onChange={(e) => set("social", { ...a.social, whatsapp: e.target.value })} /></Field>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ----------------------------- SEO ----------------------------- */
export function Seo() {
  const { pushToast } = useStore();
  const [s, setS, loading] = useServerState<AdminSeo>(getSeo);
  function set<K extends keyof AdminSeo>(k: K, v: AdminSeo[K]) {
    setS((p) => (p ? { ...p, [k]: v } : p));
  }
  async function save() {
    if (!s) return;
    try {
      await saveSeo(s);
      pushToast("تنظیمات سئو ذخیره شد.");
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

  if (loading || !s) return <Loading />;

  return (
    <div>
      <PageHeader title="سئو" subtitle="عنوان و توضیحات پیش‌فرض، آدرس پایه و نقشهٔ سایت" action={<button onClick={save} className="btn btn-primary">ذخیره</button>} />
      <div className="card max-w-2xl p-5">
        <div className="flex flex-col gap-4">
          <Field label="عنوان پیش‌فرض سایت" htmlFor="st"><input id="st" className="input" value={s.defaultTitle} onChange={(e) => set("defaultTitle", e.target.value)} /></Field>
          <Field label="توضیحات متای پیش‌فرض" htmlFor="sd"><textarea id="sd" className="input min-h-20 resize-y" value={s.defaultDescription} onChange={(e) => set("defaultDescription", e.target.value)} /></Field>
          <Field label="آدرس پایه (Canonical base)" htmlFor="sc"><input id="sc" dir="ltr" className="input text-start" value={s.canonicalBase} onChange={(e) => set("canonicalBase", e.target.value)} /></Field>
          <div className="flex flex-wrap gap-6">
            <label className="flex items-center gap-2 font-bold"><input type="checkbox" className="h-5 w-5 accent-[var(--c-accent)]" checked={s.robotsIndex} onChange={(e) => set("robotsIndex", e.target.checked)} /> اجازهٔ ایندکس</label>
            <label className="flex items-center gap-2 font-bold"><input type="checkbox" className="h-5 w-5 accent-[var(--c-accent)]" checked={s.sitemapEnabled} onChange={(e) => set("sitemapEnabled", e.target.checked)} /> نقشهٔ سایت فعال</label>
          </div>
          <button onClick={downloadSitemap} className="btn btn-secondary self-start">دانلود sitemap.xml</button>
        </div>
      </div>
    </div>
  );
}

/* ----------------------------- Redirects ----------------------------- */
export function Redirects() {
  const { pushToast } = useStore();
  const [items, setItems, loading] = useServerState<AdminRedirect[]>(listRedirects);
  const [src, setSrc] = useState("");
  const [dst, setDst] = useState("");

  const normalize = (p: string) => (p.startsWith("/") ? p : `/${p}`);
  const isUnsafe = (s: string) => /^\/(index(\.html)?)$/.test(normalize(s)) || s.trim() === "/*";

  function add() {
    const s = normalize(src.trim());
    const d = normalize(dst.trim());
    if (!s || !d) return pushToast("مبدا و مقصد را پر کنید.", "error");
    if (s === d) return pushToast("مبدا و مقصد یکسان هستند (حلقه).", "error");
    if (isUnsafe(s)) return pushToast("این مسیر مبدا باعث حلقهٔ بی‌نهایت می‌شود (/index یا /*).", "error");
    if ((items ?? []).some((r) => r.source === s)) return pushToast("این مبدا قبلاً وجود دارد.", "error");
    setItems((arr) => [...(arr ?? []), { id: `r_${Date.now().toString(36)}`, source: s, destination: d, type: 301, enabled: true }]);
    setSrc(""); setDst("");
  }
  function toggle(id: string) {
    setItems((arr) => (arr ?? []).map((r) => (r.id === id ? { ...r, enabled: !r.enabled } : r)));
  }
  function remove(id: string) {
    setItems((arr) => (arr ?? []).filter((r) => r.id !== id));
  }
  async function save() {
    if (!items) return;
    try {
      await saveRedirects(items);
      pushToast("ریدایرکت‌ها ذخیره شدند.");
    } catch {
      pushToast("ذخیره ناموفق بود؛ اتصال سرور را بررسی کنید.", "error");
    }
  }

  if (loading || !items) return <Loading />;

  return (
    <div>
      <PageHeader title="ریدایرکت‌ها" subtitle="هدایت مسیرهای قدیمی به مسیرهای جدید (۳۰۱ / ۳۰۲)" action={<button onClick={save} className="btn btn-primary">ذخیره</button>} />
      <div className="card mb-4 p-4">
        <div className="grid items-end gap-3 sm:grid-cols-[1fr_1fr_auto]">
          <Field label="مبدا (از)" htmlFor="rs"><input id="rs" dir="ltr" className="input text-start" placeholder="/old-page" value={src} onChange={(e) => setSrc(e.target.value)} /></Field>
          <Field label="مقصد (به)" htmlFor="rd"><input id="rd" dir="ltr" className="input text-start" placeholder="/new-page" value={dst} onChange={(e) => setDst(e.target.value)} /></Field>
          <button onClick={add} className="btn btn-secondary"><Plus className="h-4 w-4" /> افزودن</button>
        </div>
      </div>
      {items.length === 0 ? (
        <div className="card p-8 text-center text-sm text-muted">هنوز ریدایرکتی تعریف نشده.</div>
      ) : (
        <div className="card divide-y divide-line">
          {items.map((r) => (
            <div key={r.id} className="flex flex-wrap items-center gap-3 p-3">
              <code dir="ltr" className="rounded bg-surface2 px-2 py-1 text-sm">{r.source}</code>
              <span className="text-muted">←</span>
              <code dir="ltr" className="rounded bg-surface2 px-2 py-1 text-sm">{r.destination}</code>
              <span className="chip">{toPersianDigits(r.type)}</span>
              <label className="ms-auto flex items-center gap-2 text-sm font-bold">
                <input type="checkbox" className="h-5 w-5 accent-[var(--c-accent)]" checked={r.enabled} onChange={() => toggle(r.id)} /> فعال
              </label>
              <button onClick={() => remove(r.id)} aria-label="حذف" className="grid h-9 w-9 place-items-center rounded-lg border border-line text-danger hover:border-danger"><Trash className="h-4 w-4" /></button>
            </div>
          ))}
        </div>
      )}
      <p className="mt-4 rounded-xl bg-surface2 p-3 text-xs leading-6 text-muted">
        ریدایرکت‌ها در پنل مدیریت ذخیره می‌شوند. اعمال آن‌ها روی دامنهٔ عمومی نیازمند پیکربندی مسیریابی روی Cloudflare است (یا خروجی _redirects معتبر). مسیرهای خطرناک مانند /index یا /* به‌صورت خودکار مسدود می‌شوند تا خطای ۱۰۰۳۲۴ پیش نیاید.
      </p>
    </div>
  );
}

/* ----------------------------- Product categories ----------------------------- */
export function ProductCategories() {
  const { pushToast } = useStore();
  const [items, setItems, loading] = useServerState<AdminCategory[]>(() => serverRepository.listCategories());
  async function save() {
    if (!items) return;
    try {
      await serverRepository.saveCategories(items);
      pushToast("دسته‌بندی‌های محصولات ذخیره شدند.");
    } catch {
      pushToast("ذخیره ناموفق بود؛ اتصال سرور را بررسی کنید.", "error");
    }
  }

  if (loading || !items) return <Loading />;

  return (
    <div>
      <PageHeader title="دسته‌بندی محصولات" subtitle="دسته‌هایی که محصولات در آن‌ها قرار می‌گیرند" action={<button onClick={save} className="btn btn-primary">ذخیره</button>} />
      <div className="card divide-y divide-line">
        {items.map((c, i) => (
          <div key={c.id} className="flex flex-wrap items-center gap-2 p-3">
            <input className="input flex-1" value={c.name} onChange={(e) => setItems((arr) => (arr ?? []).map((x, idx) => (idx === i ? { ...x, name: e.target.value } : x)))} aria-label="نام" />
            <input className="input w-40" dir="ltr" value={c.slug} onChange={(e) => setItems((arr) => (arr ?? []).map((x, idx) => (idx === i ? { ...x, slug: e.target.value } : x)))} aria-label="اسلاگ" />
          </div>
        ))}
      </div>
    </div>
  );
}

/* ----------------------------- Site settings ----------------------------- */
export function SiteSettings() {
  const { pushToast } = useStore();
  const [s, setS, loading] = useServerState<AdminSettings>(() => serverRepository.getSettings());
  function set<K extends keyof AdminSettings>(k: K, v: AdminSettings[K]) {
    setS((p) => (p ? { ...p, [k]: v } : p));
  }
  async function save() {
    if (!s) return;
    try {
      await serverRepository.saveSettings(s);
      pushToast("تنظیمات سایت ذخیره شد.");
    } catch {
      pushToast("ذخیره ناموفق بود؛ اتصال سرور را بررسی کنید.", "error");
    }
  }

  if (loading || !s) return <Loading />;

  return (
    <div>
      <PageHeader title="تنظیمات سایت" subtitle="اطلاعات تماس و حد آوارس رایگان" action={<button onClick={save} className="btn btn-primary">ذخیره</button>} />
      <div className="card max-w-2xl p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="نام سایت" htmlFor="sn"><input id="sn" className="input" value={s.siteName} onChange={(e) => set("siteName", e.target.value)} /></Field>
          <Field label="حداکثر ارسال رایگان (تومان)" htmlFor="sf"><input id="sf" type="number" dir="ltr" className="input text-start" value={s.freeShippingThreshold} onChange={(e) => set("freeShippingThreshold", Number(e.target.value) || 0)} /></Field>
          <Field label="شماره تماس" htmlFor="sph"><input id="sph" dir="ltr" className="input text-start" value={s.phone} onChange={(e) => set("phone", e.target.value)} /></Field>
          <Field label="ایمیل" htmlFor="se"><input id="se" dir="ltr" className="input text-start" value={s.email} onChange={(e) => set("email", e.target.value)} /></Field>
        </div>
        <div className="mt-4">
          <Field label="شعار سایت" htmlFor="stg"><input id="stg" className="input" value={s.tagline} onChange={(e) => set("tagline", e.target.value)} /></Field>
        </div>
      </div>
      <div className="card mt-4 max-w-2xl p-5">
        <p className="font-bold">دربارهٔ انتشار</p>
        <p className="mt-1 text-sm leading-7 text-muted">برای انتشار خودکار محتوا از طریق GitHub روی Cloudflare، به صفحهٔ <Link to="/admin/setup" className="text-accent hover:underline">راه‌اندازی یک‌باره</Link> بروید. نوار بنفش اعلان حذف شده و بازنخواهد گشت.</p>
      </div>
    </div>
  );
}
