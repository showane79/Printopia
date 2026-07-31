import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { deleteAdminProduct, getAdminProduct, saveAdminProduct } from "../services/repository";
import { invalidateProducts } from "../lib/catalog";
import { categories } from "@/data/catalog";
import { localMedia } from "../services/media";
import { useStore } from "@/context/StoreContext";
import { Field, ConfirmDialog } from "../ui";
import { Modal } from "@/components/Modal";
import { Check } from "@/components/icons";
import { formatPrice, toPersianDigits } from "@/utils/format";
import { cn } from "@/utils/cn";
import type { AdminProduct } from "../types";

const MATERIALS = ["PLA", "PETG", "Resin", "TPU"];

function sanitizeSlug(s: string) {
  return s.trim().replace(/\s+/g, "-").replace(/[؟?،,.]/g, "").slice(0, 80) || `product-${Date.now()}`;
}

function emptyProduct(): AdminProduct {
  const now = new Date().toISOString();
  return {
    id: `p_${Date.now().toString(36)}`,
    slug: "",
    title: "",
    subtitle: "",
    category: categories[0]?.id ?? "statues",
    price: 0,
    oldPrice: undefined,
    image: undefined,
    imageAlt: "",
    material: "PLA",
    customizable: false,
    inStock: true,
    featured: false,
    badge: undefined,
    productionDays: 3,
    shortDesc: "",
    description: "",
    status: "draft",
    isCustom: true,
    createdAt: now,
    updatedAt: now,
  };
}

export default function ProductEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { pushToast } = useStore();
  const isNew = !id || id === "new";

  const [product, setProduct] = useState<AdminProduct>(emptyProduct);
  const [existing, setExisting] = useState(false);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [slugTouched, setSlugTouched] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [preview, setPreview] = useState(false);
  const [picker, setPicker] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Load the product from the server (D1) when editing.
  useEffect(() => {
    if (isNew) return;
    let alive = true;
    setLoading(true);
    getAdminProduct(id!)
      .then((found) => {
        if (!alive) return;
        if (found) {
          setProduct(found);
          setExisting(true);
          setSlugTouched(!!found.slug);
        }
        setLoading(false);
      })
      .catch(() => {
        if (!alive) return;
        pushToast("بارگذاری محصول ناموفق بود.", "error");
        setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [id, isNew, pushToast]);

  function set<K extends keyof AdminProduct>(k: K, v: AdminProduct[K]) {
    setProduct((p) => ({ ...p, [k]: v }));
    setDirty(true);
  }
  function setTitle(v: string) {
    setProduct((p) => ({ ...p, title: v, slug: slugTouched ? p.slug : sanitizeSlug(v) }));
    setDirty(true);
  }

  async function save(status: AdminProduct["status"]) {
    if (!product.title.trim()) {
      pushToast("عنوان محصول الزامی است.", "error");
      return;
    }
    const next: AdminProduct = {
      ...product,
      slug: product.slug.trim() || sanitizeSlug(product.title),
      status,
    };
    setSaving(true);
    try {
      const saved = await saveAdminProduct(next);
      setProduct(saved);
      setExisting(true);
      setDirty(false);
      invalidateProducts();
      pushToast(status === "published" ? "محصول ذخیره و منتشر شد." : "پیش‌نویس ذخیره شد.");
    } catch {
      pushToast("ذخیره ناموفق بود؛ اتصال را بررسی کنید.", "error");
    } finally {
      setSaving(false);
    }
  }

  async function doDelete() {
    setConfirmDelete(false);
    setSaving(true);
    try {
      await deleteAdminProduct(product.id);
      invalidateProducts();
      pushToast("محصول حذف شد", "info");
      navigate("/admin/products");
    } catch {
      pushToast("حذف ناموفق بود.", "error");
    } finally {
      setSaving(false);
    }
  }

  const hints = useMemo(() => {
    const list: { ok: boolean; msg: string }[] = [];
    list.push({ ok: product.title.length >= 3 && product.title.length <= 60, msg: `عنوان: ${toPersianDigits(product.title.length)} نویسه` });
    list.push({ ok: !!product.slug.trim(), msg: product.slug.trim() ? "اسلاگ تنظیم شده" : "اسلاگ خالی است" });
    list.push({ ok: product.price > 0, msg: product.price > 0 ? "قیمت وارد شده" : "قیمت را وارد کنید" });
    list.push({ ok: !!product.shortDesc.trim() && product.shortDesc.length <= 160, msg: "خلاصهٔ کوتاه (تا ۱۶۰ نویسه)" });
    const alt = product.imageAlt ?? "";
    list.push({ ok: !!product.image && alt.trim().length > 0, msg: product.image ? (alt.trim() ? "متن جایگزین تصویر ثبت شده" : "متن جایگزین تصویر خالی است") : "تصویر محصول را اضافه کنید" });
    return list;
  }, [product]);

  if (loading) {
    return (
      <div className="card p-10 text-center text-muted" aria-busy="true">
        <span className="mx-auto block h-7 w-7 animate-spin rounded-full border-2 border-accent border-t-transparent" />
        <p className="mt-3 text-sm">در حال بارگذاری محصول…</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <Link to="/admin/products" className="btn btn-ghost text-sm">بازگشت به محصولات</Link>
        <div className="flex items-center gap-2">
          {dirty && <span className="chip border-warning/30 bg-warning/12 text-warning">تغییرات ذخیره نشده</span>}
          <span className={cn("chip", product.status === "published" ? "border-success/30 bg-success/12 text-success" : "border-line bg-surface2/60 text-muted")}>
            {product.status === "published" ? "فعال" : "پیش‌نویس"}
          </span>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="flex flex-col gap-5">
          <Field label="نام محصول" htmlFor="title">
            <input id="title" className="input text-lg" value={product.title} onChange={(e) => setTitle(e.target.value)} placeholder="نام دقیق محصول" />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="اسلاگ" htmlFor="slug" hint="بخش آدرس محصول در سایت">
              <input id="slug" dir="ltr" className="input text-start" value={product.slug} onChange={(e) => { setSlugTouched(true); set("slug", e.target.value); }} placeholder="product-slug" />
            </Field>
            <Field label="دسته‌بندی" htmlFor="cat">
              <select id="cat" className="input" value={product.category} onChange={(e) => set("category", e.target.value)}>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </Field>
          </div>

          <Field label="توضیح کوتاه" htmlFor="subtitle">
            <input id="subtitle" className="input" value={product.subtitle} onChange={(e) => set("subtitle", e.target.value)} placeholder="یک جمله برای زیر عنوان" />
          </Field>

          <Field label="خلاصهٔ کوتاه" htmlFor="short">
            <textarea id="short" className="input min-h-20 resize-y" value={product.shortDesc} onChange={(e) => set("shortDesc", e.target.value)} placeholder="معرفی کوتاه محصول برای کاربر و موتورهای جستجو" />
          </Field>

          <Field label="توضیح کامل" htmlFor="desc">
            <textarea id="desc" className="input min-h-32 resize-y" value={product.description} onChange={(e) => set("description", e.target.value)} placeholder="توضیحات کامل محصول..." />
          </Field>

          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="قیمت (تومان)" htmlFor="price">
              <input id="price" type="number" dir="ltr" className="input text-start" value={product.price} onChange={(e) => set("price", Number(e.target.value) || 0)} />
            </Field>
            <Field label="قیمت تخفیف‌خورده (اختیاری)" htmlFor="old">
              <input id="old" type="number" dir="ltr" className="input text-start" value={product.oldPrice ?? ""} onChange={(e) => set("oldPrice", e.target.value ? Number(e.target.value) : undefined)} />
            </Field>
            <Field label="زمان آماده‌سازی (روز)" htmlFor="days">
              <input id="days" type="number" dir="ltr" className="input text-start" value={product.productionDays} onChange={(e) => set("productionDays", Number(e.target.value) || 1)} />
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="متریال" htmlFor="mat">
              <select id="mat" className="input" value={product.material} onChange={(e) => set("material", e.target.value)}>
                {MATERIALS.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            </Field>
            <Field label="برچسب (اختیاری)" htmlFor="badge">
              <input id="badge" className="input" value={product.badge ?? ""} onChange={(e) => set("badge", e.target.value || undefined)} placeholder="مثلاً: جدید، پرفروش" />
            </Field>
          </div>

          {/* image */}
          <Field label="تصویر اصلی" htmlFor="img">
            <div className="flex items-center gap-3">
              {product.image ? (
                <img src={product.image} alt={product.imageAlt || ""} className="h-20 w-28 rounded-xl object-cover" />
              ) : (
                <div className="grid h-20 w-28 place-items-center rounded-xl border border-dashed border-line text-xs text-muted">بدون تصویر</div>
              )}
              <div className="flex flex-col gap-2">
                <button type="button" onClick={() => setPicker(true)} className="btn btn-secondary text-sm">انتخاب از رسانه‌ها</button>
                {product.image && <button type="button" onClick={() => set("image", undefined)} className="text-xs text-danger">حذف تصویر</button>}
              </div>
            </div>
          </Field>
          <Field label="متن جایگزین تصویر" htmlFor="alt">
            <input id="alt" className="input" value={product.imageAlt ?? ""} onChange={(e) => set("imageAlt", e.target.value)} placeholder="توضیح تصویر برای دسترس‌پذیری و سئو" />
          </Field>

          {/* toggles */}
          <div className="card grid gap-3 p-4 sm:grid-cols-3">
            {([["inStock", "موجود"], ["customizable", "قابل شخصی‌سازی"], ["featured", "محصول ویژه"]] as const).map(([key, label]) => (
              <label key={key} className="flex cursor-pointer items-center gap-2 font-bold">
                <input type="checkbox" className="h-5 w-5 accent-[var(--c-accent)]" checked={!!product[key]} onChange={(e) => set(key, e.target.checked as never)} />
                {label}
              </label>
            ))}
          </div>
        </div>

        {/* sidebar */}
        <aside className="flex flex-col gap-5 lg:sticky lg:top-24 lg:self-start">
          <div className="card p-4">
            <p className="mb-3 text-sm font-bold">ذخیره و انتشار</p>
            <div className="flex flex-col gap-2">
              <button type="button" disabled={saving} onClick={() => void save("published")} className="btn btn-primary w-full">
                {saving ? "در حال ذخیره…" : "انتشار"}
              </button>
              <button type="button" disabled={saving} onClick={() => void save("draft")} className="btn btn-secondary w-full text-sm">ذخیره پیش‌نویس</button>
              <button type="button" onClick={() => setPreview(true)} className="btn btn-ghost w-full text-sm">پیش‌نمایش</button>
              {existing && (
                <button type="button" onClick={() => setConfirmDelete(true)} className="btn btn-ghost w-full text-sm text-danger">حذف محصول</button>
              )}
            </div>
          </div>

          <div className="card p-4">
            <p className="mb-3 text-sm font-bold">راهنمای سئو</p>
            <ul className="flex flex-col gap-2 text-xs">
              {hints.map((h, i) => (
                <li key={i} className="flex items-start gap-2">
                  <Check className={cn("mt-0.5 h-4 w-4 shrink-0", h.ok ? "text-success" : "text-muted")} />
                  <span className={h.ok ? "text-muted" : "text-warning"}>{h.msg}</span>
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </div>

      {/* preview */}
      <Modal open={preview} onClose={() => setPreview(false)} title="پیش‌نمایش محصول" size="lg">
        <div className="max-h-[78vh] overflow-auto p-6">
          {product.image && <img src={product.image} alt={product.imageAlt || ""} className="mx-auto aspect-square max-w-sm rounded-xl object-cover" />}
          <h1 className="mt-4 text-2xl font-extrabold">{product.title || "بدون عنوان"}</h1>
          <p className="mt-1 text-muted">{product.subtitle}</p>
          <p className="mt-3 text-2xl font-extrabold">{formatPrice(product.price)}</p>
          <p className="mt-4 leading-8 text-muted">{product.shortDesc}</p>
        </div>
      </Modal>

      {/* media picker */}
      <Modal open={picker} onClose={() => setPicker(false)} title="انتخاب تصویر" size="lg">
        <div className="max-h-[70vh] overflow-auto p-4">
          {localMedia.list().length === 0 ? (
            <p className="py-8 text-center text-sm text-muted">رسانه‌ای موجود نیست. به بخش «رسانه‌ها» بروید.</p>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {localMedia.list().map((m) => (
                <button key={m.id} type="button" onClick={() => { set("image", m.url); set("imageAlt", m.alt); setPicker(false); }} className="card overflow-hidden text-start hover:border-accent">
                  <img src={m.url} alt={m.alt} className="aspect-video w-full object-cover" />
                  <p className="truncate p-2 text-xs text-muted">{m.alt}</p>
                </button>
              ))}
            </div>
          )}
        </div>
      </Modal>

      <ConfirmDialog
        open={confirmDelete}
        title="حذف محصول"
        message={`آیا «${product.title || "این محصول"}» حذف شود؟ این عمل قابل بازگشت نیست.`}
        confirmText="حذف"
        danger
        onConfirm={() => void doDelete()}
        onCancel={() => setConfirmDelete(false)}
      />
    </div>
  );
}
