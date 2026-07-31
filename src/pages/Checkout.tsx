import { useState, type FormEvent, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { useStore } from "@/context/StoreContext";
import { site } from "@/data/site";
import { useSeo } from "@/components/Seo";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { EmptyState } from "@/components/EmptyState";
import { Check, Shield } from "@/components/icons";
import { formatPrice, toPersianDigits } from "@/utils/format";
import { imgFallback } from "@/utils/img";
import { cn } from "@/utils/cn";

const SHIPPING_COST = 60_000;
const faDigits = "۰۱۲۳۴۵۶۷۸۹";
const toLatin = (s: string) => s.replace(/[۰-۹]/g, (d) => String(faDigits.indexOf(d))).replace(/[^\d]/g, "");

function Field({
  id,
  label,
  error,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-2 block font-bold">
        {label}
      </label>
      {children}
      {error && (
        <p role="alert" className="mt-1.5 text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

export default function Checkout() {
  const { cart, cartSubtotal, clearCart } = useStore();
  const [placed, setPlaced] = useState(false);
  const [orderNo, setOrderNo] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [form, setForm] = useState({
    name: "",
    phone: "",
    address: "",
    city: "",
    postal: "",
    delivery: "post",
    payment: "gateway",
  });

  const freeShip = site.freeShippingThreshold;
  const shipping = cartSubtotal === 0 || cartSubtotal >= freeShip ? 0 : SHIPPING_COST;
  const total = cartSubtotal + shipping;

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => ({ ...e, [key]: "" }));
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!form.name.trim()) errs.name = "نام گیرنده الزامی است.";
    if (!/^09\d{9}$/.test(toLatin(form.phone))) errs.phone = "شماره موبایل معتبر وارد کنید.";
    if (form.address.trim().length < 10) errs.address = "آدرس کامل را وارد کنید.";
    if (!form.city.trim()) errs.city = "شهر را وارد کنید.";
    if (form.postal && !/^\d{10}$/.test(toLatin(form.postal))) errs.postal = "کد پستی باید ۱۰ رقم باشد.";
    setErrors(errs);
    if (Object.keys(errs).length) return;
    const id = "PT-" + Math.floor(100000 + Math.random() * 900000);
    setOrderNo(id);
    setPlaced(true);
    clearCart();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  useSeo({ title: "تسویه حساب | پرینتوپیا", description: "تکمیل سفارش و پرداخت امن در فروشگاه پرینتوپیا." });

  if (placed) {
    return (
      <div className="container-x py-12">
        <div className="card mx-auto max-w-xl p-8 text-center">
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-success/15 text-success">
            <Check className="h-8 w-8" />
          </div>
          <h1 className="mt-4 text-2xl font-extrabold">سفارش شما با موفقیت ثبت شد!</h1>
          <p className="mt-2 leading-8 text-muted">
            کد پیگیری سفارش شما: <span className="font-bold text-fg" dir="ltr">{toPersianDigits(orderNo)}</span>
          </p>
          <p className="mt-1 leading-8 text-muted">
            جزئیات ارسال و پیگیری، به زودی برای شما ارسال می‌شود. از اعتماد شما سپاسگزاریم.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            <Link to="/shop" className="btn btn-primary">ادامه خرید</Link>
            <Link to="/" className="btn btn-secondary">بازگشت به خانه</Link>
          </div>
        </div>
      </div>
    );
  }

  if (cart.length === 0) {
    return (
      <div className="container-x py-8">
        <Breadcrumbs items={[{ label: "خانه", to: "/" }, { label: "تسویه حساب" }]} />
        <div className="mt-8">
          <EmptyState
            title="سبد خرید خالی است"
            description="برای تسویهٔ حساب ابتدا محصولاتی را به سبد اضافه کنید."
            action={<Link to="/shop" className="btn btn-primary">رفتن به فروشگاه</Link>}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="container-x py-8">
      <Breadcrumbs items={[{ label: "خانه", to: "/" }, { label: "سبد خرید", to: "/cart" }, { label: "تسویه حساب" }]} />
      <h1 className="mt-5 text-2xl font-extrabold md:text-3xl">تسویه حساب</h1>

      <form onSubmit={submit} className="mt-6 grid gap-6 lg:grid-cols-[1fr_360px]" noValidate>
        <div className="space-y-6">
          {/* shipping info */}
          <section className="card p-5 md:p-6">
            <h2 className="mb-4 text-lg font-extrabold">اطلاعات ارسال</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field id="name" label="نام و نام خانوادگی گیرنده" error={errors.name}>
                <input id="name" className="input" value={form.name} onChange={(e) => set("name", e.target.value)} />
              </Field>
              <Field id="phone" label="شماره موبایل" error={errors.phone}>
                <input id="phone" type="tel" dir="ltr" inputMode="tel" className="input text-start" placeholder="09123456789" value={form.phone} onChange={(e) => set("phone", e.target.value)} />
              </Field>
              <Field id="city" label="شهر" error={errors.city}>
                <input id="city" className="input" value={form.city} onChange={(e) => set("city", e.target.value)} />
              </Field>
              <Field id="postal" label="کد پستی (اختیاری)" error={errors.postal}>
                <input id="postal" dir="ltr" inputMode="numeric" className="input text-start" placeholder="کد ۱۰ رقمی" value={form.postal} onChange={(e) => set("postal", e.target.value)} />
              </Field>
              <div className="sm:col-span-2">
                <Field id="address" label="آدرس کامل" error={errors.address}>
                  <textarea id="address" rows={3} className="input resize-y" placeholder="استان، شهر، خیابان، پلاک و واحد" value={form.address} onChange={(e) => set("address", e.target.value)} />
                </Field>
              </div>
            </div>
          </section>

          {/* delivery */}
          <section className="card p-5 md:p-6">
            <h2 className="mb-4 text-lg font-extrabold">روش ارسال</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {[
                { id: "post", label: "پست پیشتاز", desc: "۳ تا ۵ روز کاری", cost: shipping },
                { id: "tipax", label: "چاپار", desc: "۱ تا ۳ روز کاری", cost: shipping === 0 ? 0 : SHIPPING_COST + 20_000 },
              ].map((d) => (
                <label key={d.id} className={cn("flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition", form.delivery === d.id ? "border-accent bg-accent/5" : "border-line")}>
                  <input type="radio" name="delivery" className="sr-only" checked={form.delivery === d.id} onChange={() => set("delivery", d.id)} />
                  <span className={cn("mt-0.5 grid h-5 w-5 place-items-center rounded-full border", form.delivery === d.id ? "border-accent" : "border-line")}>
                    {form.delivery === d.id && <span className="h-2.5 w-2.5 rounded-full bg-accent" />}
                  </span>
                  <span>
                    <span className="block font-bold">{d.label}</span>
                    <span className="block text-sm text-muted">{d.desc}</span>
                    <span className="mt-1 block text-sm font-semibold">{d.cost === 0 ? "رایگان" : formatPrice(d.cost)}</span>
                  </span>
                </label>
              ))}
            </div>
          </section>

          {/* payment */}
          <section className="card p-5 md:p-6">
            <h2 className="mb-1 text-lg font-extrabold">روش پرداخت</h2>
            <p className="mb-4 text-xs text-muted">درگاه‌های پرداخت به‌صورت نمونه نمایش داده می‌شوند.</p>
            <div className="grid gap-3 sm:grid-cols-3">
              {[
                { id: "gateway", label: "درگاه آنلاین", desc: "پرداخت با کارت" },
                { id: "cod", label: "پرداخت در محل", desc: "هنگام تحویل" },
                { id: "card", label: "کارت به کارت", desc: "ثبت دستی" },
              ].map((p) => (
                <label key={p.id} className={cn("flex cursor-pointer flex-col gap-1 rounded-xl border p-4 transition", form.payment === p.id ? "border-accent bg-accent/5" : "border-line")}>
                  <input type="radio" name="payment" className="sr-only" checked={form.payment === p.id} onChange={() => set("payment", p.id)} />
                  <span className="font-bold">{p.label}</span>
                  <span className="text-sm text-muted">{p.desc}</span>
                </label>
              ))}
            </div>
          </section>
        </div>

        {/* summary */}
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="card p-5">
            <h2 className="font-extrabold">سفارش شما</h2>
            <ul className="mt-4 space-y-3">
              {cart.map((item) => (
                <li key={item.key} className="flex items-center gap-3">
                  <div className="relative shrink-0">
                    <img {...imgFallback} src={item.image} alt={item.title} className="h-14 w-14 rounded-lg bg-surface2 object-cover" />
                    <span className="absolute -end-1.5 -top-1.5 grid h-5 min-w-5 place-items-center rounded-full bg-accent px-1 text-[10px] font-bold text-white">
                      {toPersianDigits(item.qty)}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold">{item.title}</p>
                    <p className="text-xs text-muted">{item.color}</p>
                  </div>
                  <span className="text-sm font-semibold">{formatPrice(item.unitPrice * item.qty)}</span>
                </li>
              ))}
            </ul>
            <dl className="mt-4 space-y-2 border-t border-line pt-4 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted">جمع کالاها</dt>
                <dd>{formatPrice(cartSubtotal)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted">ارسال</dt>
                <dd>{shipping === 0 ? "رایگان" : formatPrice(shipping)}</dd>
              </div>
              <div className="flex items-center justify-between border-t border-line pt-3 text-base">
                <dt className="font-bold">قابل پرداخت</dt>
                <dd className="font-extrabold">{formatPrice(total)}</dd>
              </div>
            </dl>
            <button type="submit" className="btn btn-primary mt-5 w-full">
              ثبت و پرداخت سفارش
            </button>
            <p className="mt-3 flex items-center justify-center gap-1.5 text-xs text-muted">
              <Shield className="h-4 w-4" /> پرداخت امن و رمزنگاری‌شده
            </p>
          </div>
        </aside>
      </form>
    </div>
  );
}
