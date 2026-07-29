import { useState } from "react";
import { Link } from "react-router-dom";
import { useSeo } from "@/components/Seo";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { useStore } from "@/context/StoreContext";
import { Check, Close, Sparkles, Upload, Cube, Palette, Layers } from "@/components/icons";
import { formatNumber, toPersianDigits } from "@/utils/format";
import { cn } from "@/utils/cn";

const faDigits = "۰۱۲۳۴۵۶۷۸۹";
const toLatin = (s: string) =>
  s.replace(/[۰-۹]/g, (d) => String(faDigits.indexOf(d))).replace(/[^\d]/g, "");

const stepsMeta = [
  { id: 1, title: "نوع سفارش", icon: Cube },
  { id: 2, title: "فایل مرجع", icon: Upload },
  { id: 3, title: "متریال و رنگ", icon: Palette },
  { id: 4, title: "ابعاد و تعداد", icon: Layers },
  { id: 5, title: "ثبت درخواست", icon: Check },
];

const orderTypes = [
  { value: "file", label: "چاپ از فایل سه‌بعدی", desc: "فایل آماده STL/OBJ/3MF دارم." },
  { value: "idea", label: "طراحی از روی تصویر یا ایده", desc: "تصویر یا طرح ذهنی دارم." },
  { value: "customize", label: "شخصی‌سازی محصول آماده", desc: "می‌خواهم محصولی را سفارشی کنم." },
];

const materialOpts = ["PLA", "PETG", "Resin", "TPU"];
const colorOpts = [
  { name: "بنفش", hex: "#8b5cf6" },
  { name: "فیروزه‌ای", hex: "#22d3ee" },
  { name: "مشکی", hex: "#1c2230" },
  { name: "سفید", hex: "#e9ecf2" },
  { name: "سبز", hex: "#22c55e" },
  { name: "نارنجی", hex: "#f97316" },
];
const responseMethods = ["تماس تلفنی", "پیامک", "ایمیل", "واتساپ"];

export default function CustomOrder() {
  const { pushToast } = useStore();
  const [step, setStep] = useState(1);
  const [done, setDone] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [form, setForm] = useState({
    orderType: "",
    fileName: "",
    material: "",
    color: "",
    dimensions: "",
    quantity: 1,
    name: "",
    phone: "",
    email: "",
    description: "",
    responseMethod: "",
  });

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => ({ ...e, [key]: "" }));
  }

  function validateStep(s: number): boolean {
    const e: Record<string, string> = {};
    if (s === 1 && !form.orderType) e.orderType = "لطفاً نوع سفارش را انتخاب کنید.";
    if (s === 3 && !form.material) e.material = "لطفاً متریال را انتخاب کنید.";
    if (s === 4 && form.quantity < 1) e.quantity = "تعداد باید حداقل ۱ باشد.";
    if (s === 5) {
      if (!form.name.trim()) e.name = "نام و نام خانوادگی الزامی است.";
      const phone = toLatin(form.phone);
      if (!/^09\d{9}$/.test(phone)) e.phone = "شماره موبایل معتبر وارد کنید (مثال: ۰۹۱۲۳۴۵۶۷۸۹).";
      if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
        e.email = "ایمیل معتبر وارد کنید.";
      if (!form.responseMethod) e.responseMethod = "روش دریافت پاسخ را انتخاب کنید.";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function next() {
    if (!validateStep(step)) return;
    setStep((s) => Math.min(5, s + 1));
  }
  function back() {
    setStep((s) => Math.max(1, s - 1));
  }
  function submit() {
    if (!validateStep(5)) return;
    setDone(true);
    pushToast("درخواست سفارش اختصاصی شما ثبت شد ✦");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  useSeo({
    title: "چاپ سه‌بعدی اختصاصی و سفارشی | پرینتوپیا",
    description:
      "ثبت سفارش چاپ سه‌بعدی اختصاصی: آپلود فایل STL/OBJ یا تصویر مرجع، انتخاب متریال، رنگ، ابعاد و تعداد. اگر فایل ندارید، ایده خود را بفرستید تا امکان‌سنجی شود.",
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "Service",
      serviceType: "چاپ سه‌بعدی اختصاصی",
      provider: { "@type": "Organization", name: "پرینتوپیا" },
      areaServed: "IR",
    },
  });

  function FieldError({ name }: { name: string }) {
    if (!errors[name]) return null;
    return (
      <p role="alert" className="mt-1.5 text-sm text-danger">
        {errors[name]}
      </p>
    );
  }

  return (
    <div className="container-x py-8">
      <Breadcrumbs items={[{ label: "خانه", to: "/" }, { label: "چاپ سه‌بعدی اختصاصی" }]} />

      <header className="mt-5 max-w-2xl">
        <span className="chip mb-3 border-accent2/30 bg-accent2/10 text-accent2">
          <Sparkles className="h-3.5 w-3.5" /> سفارش اختصاصی
        </span>
        <h1 className="text-2xl font-extrabold md:text-3xl">ساخت محصول اختصاصی شما</h1>
        <p className="mt-2 leading-8 text-muted">
          در چند گام ساده، جزئیات سفارش خود را ثبت کنید. اگر فایل سه‌بعدی ندارید، تصویر یا ایدهٔ خود را
          ارسال کنید تا امکان‌سنجی شود.
        </p>
      </header>

      {done ? (
        <div className="card mx-auto mt-8 max-w-xl p-8 text-center">
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-success/15 text-success">
            <Check className="h-8 w-8" />
          </div>
          <h2 className="mt-4 text-2xl font-extrabold">درخواست شما ثبت شد!</h2>
          <p className="mt-2 leading-8 text-muted">
            کارشناسان پرینتوپیا در اولین فرصت از طریق {form.responseMethod || "تماس"} با شما ارتباط
            می‌گیرند و پیش‌فاکتور را ارسال می‌کنند.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            <Link to="/shop" className="btn btn-primary">ادامه خرید</Link>
            <Link to="/" className="btn btn-secondary">بازگشت به خانه</Link>
          </div>
        </div>
      ) : (
        <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_320px]">
          <div>
            {/* stepper */}
            <ol className="flex items-center gap-1 overflow-x-auto pb-2">
              {stepsMeta.map((s, i) => {
                const state = step > s.id ? "done" : step === s.id ? "current" : "todo";
                return (
                  <li key={s.id} className="flex flex-1 items-center gap-1">
                    <div
                      className={cn(
                        "grid h-9 w-9 shrink-0 place-items-center rounded-full border text-sm font-bold transition",
                        state === "done" && "border-accent bg-accent text-white",
                        state === "current" && "border-accent text-accent",
                        state === "todo" && "border-line text-muted"
                      )}
                    >
                      {state === "done" ? <Check className="h-4 w-4" /> : toPersianDigits(s.id)}
                    </div>
                    {i < stepsMeta.length - 1 && (
                      <span className={cn("h-0.5 flex-1 rounded", step > s.id ? "bg-accent" : "bg-line")} />
                    )}
                  </li>
                );
              })}
            </ol>

            <div className="card mt-4 p-6 md:p-8">
              <h2 className="mb-1 flex items-center gap-2 text-lg font-extrabold">
                گام {toPersianDigits(step)} از ۵ — {stepsMeta[step - 1].title}
              </h2>

              {/* STEP 1 */}
              {step === 1 && (
                <div className="mt-4 space-y-3">
                  {orderTypes.map((o) => (
                    <label
                      key={o.value}
                      className={cn(
                        "flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition",
                        form.orderType === o.value ? "border-accent bg-accent/5" : "border-line hover:border-accent/50"
                      )}
                    >
                      <input
                        type="radio"
                        name="orderType"
                        value={o.value}
                        className="sr-only"
                        checked={form.orderType === o.value}
                        onChange={() => set("orderType", o.value)}
                      />
                      <span
                        className={cn(
                          "mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full border",
                          form.orderType === o.value ? "border-accent" : "border-line"
                        )}
                      >
                        {form.orderType === o.value && <span className="h-2.5 w-2.5 rounded-full bg-accent" />}
                      </span>
                      <span>
                        <span className="block font-bold">{o.label}</span>
                        <span className="block text-sm text-muted">{o.desc}</span>
                      </span>
                    </label>
                  ))}
                  <FieldError name="orderType" />
                </div>
              )}

              {/* STEP 2 */}
              {step === 2 && (
                <div className="mt-4">
                  <p className="mb-3 rounded-xl bg-surface2 p-3 text-sm leading-7 text-muted">
                    اگر فایل سه‌بعدی ندارید، تصویر یا ایدهٔ خود را ارسال کنید تا امکان‌سنجی شود.
                  </p>
                  {form.fileName ? (
                    <div className="flex items-center justify-between gap-2 rounded-xl border border-line bg-surface2 px-4 py-3">
                      <span className="truncate text-sm">{form.fileName}</span>
                      <button type="button" onClick={() => set("fileName", "")} aria-label="حذف فایل" className="text-muted hover:text-danger">
                        <Close className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-line bg-surface2 px-4 py-10 text-center transition hover:border-accent hover:text-accent">
                      <Upload className="h-8 w-8" />
                      <span className="font-bold">فایل را اینجا بارگذاری کنید</span>
                      <span className="text-sm text-muted">فرمت‌ها: STL، OBJ، 3MF یا تصویر (حداکثر ۲۵ مگابایت)</span>
                      <input
                        type="file"
                        className="sr-only"
                        accept=".stl,.obj,.3mf,image/*"
                        onChange={(e) => set("fileName", e.target.files?.[0]?.name ?? "")}
                      />
                    </label>
                  )}
                  <p className="mt-3 text-xs text-muted">می‌توانید این مرحله را رد کنید و بعداً فایل را ارسال کنید.</p>
                </div>
              )}

              {/* STEP 3 */}
              {step === 3 && (
                <div className="mt-4 space-y-6">
                  <div>
                    <p className="mb-2 font-bold">متریال</p>
                    <div className="flex flex-wrap gap-2">
                      {materialOpts.map((m) => (
                        <button
                          key={m}
                          type="button"
                          onClick={() => set("material", m)}
                          aria-pressed={form.material === m}
                          className={cn(
                            "rounded-xl border px-4 py-2 text-sm font-bold transition",
                            form.material === m ? "border-accent bg-accent/10 text-accent" : "border-line bg-surface2"
                          )}
                        >
                          {m}
                        </button>
                      ))}
                    </div>
                    <FieldError name="material" />
                  </div>
                  <div>
                    <p className="mb-2 font-bold">رنگ</p>
                    <div className="flex flex-wrap gap-2">
                      {colorOpts.map((c) => (
                        <button
                          key={c.name}
                          type="button"
                          onClick={() => set("color", c.name)}
                          aria-label={c.name}
                          aria-pressed={form.color === c.name}
                          className={cn(
                            "h-9 w-9 rounded-full border-2 transition",
                            form.color === c.name ? "border-accent ring-2 ring-accent/30" : "border-line"
                          )}
                          style={{ backgroundColor: c.hex }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 4 */}
              {step === 4 && (
                <div className="mt-4 space-y-5">
                  <div>
                    <label htmlFor="dim" className="mb-2 block font-bold">ابعاد تقریبی</label>
                    <input
                      id="dim"
                      className="input"
                      placeholder="مثلاً ۱۲ × ۸ × ۸ سانتی‌متر"
                      value={form.dimensions}
                      onChange={(e) => set("dimensions", e.target.value)}
                    />
                  </div>
                  <div>
                    <label htmlFor="qty" className="mb-2 block font-bold">تعداد</label>
                    <div className="flex items-center gap-3">
                      <input
                        id="qty"
                        type="number"
                        min={1}
                        className="input w-28"
                        value={form.quantity}
                        onChange={(e) => set("quantity", Math.max(1, Number(e.target.value) || 1))}
                      />
                      <span className="text-sm text-muted">عدد</span>
                    </div>
                    <FieldError name="quantity" />
                  </div>
                </div>
              )}

              {/* STEP 5 */}
              {step === 5 && (
                <div className="mt-4 space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label htmlFor="name" className="mb-2 block font-bold">نام و نام خانوادگی</label>
                      <input id="name" className="input" value={form.name} onChange={(e) => set("name", e.target.value)} />
                      <FieldError name="name" />
                    </div>
                    <div>
                      <label htmlFor="phone" className="mb-2 block font-bold">شماره تماس</label>
                      <input id="phone" type="tel" dir="ltr" inputMode="tel" className="input text-start" placeholder="09123456789" value={form.phone} onChange={(e) => set("phone", e.target.value)} />
                      <FieldError name="phone" />
                    </div>
                  </div>
                  <div>
                    <label htmlFor="email" className="mb-2 block font-bold">ایمیل (اختیاری)</label>
                    <input id="email" type="email" dir="ltr" className="input text-start" placeholder="you@example.com" value={form.email} onChange={(e) => set("email", e.target.value)} />
                    <FieldError name="email" />
                  </div>
                  <div>
                    <label htmlFor="desc" className="mb-2 block font-bold">توضیحات تکمیلی</label>
                    <textarea id="desc" rows={4} className="input resize-y" placeholder="هر نکته‌ای درباره طرح، کاربرد یا جزئیات دلخواه..." value={form.description} onChange={(e) => set("description", e.target.value)} />
                  </div>
                  <div>
                    <p className="mb-2 font-bold">روش دریافت پاسخ</p>
                    <div className="flex flex-wrap gap-2">
                      {responseMethods.map((m) => (
                        <button key={m} type="button" onClick={() => set("responseMethod", m)} aria-pressed={form.responseMethod === m}
                          className={cn("rounded-xl border px-4 py-2 text-sm font-semibold transition", form.responseMethod === m ? "border-accent bg-accent/10 text-accent" : "border-line bg-surface2")}>
                          {m}
                        </button>
                      ))}
                    </div>
                    <FieldError name="responseMethod" />
                  </div>
                </div>
              )}

              {/* nav */}
              <div className="mt-7 flex items-center justify-between gap-3 border-t border-line pt-5">
                <button type="button" onClick={back} disabled={step === 1} className="btn btn-ghost disabled:opacity-40">
                  مرحلهٔ قبل
                </button>
                {step < 5 ? (
                  <button type="button" onClick={next} className="btn btn-primary">
                    مرحلهٔ بعد
                  </button>
                ) : (
                  <button type="button" onClick={submit} className="btn btn-primary">
                    ثبت درخواست نهایی
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* summary aside */}
          <aside className="lg:sticky lg:top-24 lg:self-start">
            <div className="card p-5">
              <h2 className="font-extrabold">خلاصهٔ سفارش</h2>
              <dl className="mt-4 space-y-3 text-sm">
                <div className="flex justify-between gap-2">
                  <dt className="text-muted">نوع سفارش</dt>
                  <dd className="font-semibold">{orderTypes.find((o) => o.value === form.orderType)?.label ?? "—"}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-muted">فایل</dt>
                  <dd className="max-w-[55%] truncate font-semibold">{form.fileName || "—"}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-muted">متریال</dt>
                  <dd className="font-semibold">{form.material || "—"}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-muted">رنگ</dt>
                  <dd className="font-semibold">{form.color || "—"}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-muted">ابعاد</dt>
                  <dd className="font-semibold">{form.dimensions || "—"}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-muted">تعداد</dt>
                  <dd className="font-semibold">{form.quantity ? formatNumber(form.quantity) : "—"}</dd>
                </div>
              </dl>
              <div className="mt-5 rounded-xl bg-surface2 p-3 text-xs leading-6 text-muted">
                قیمت نهایی پس از بررسی فنی و بر اساس متریال، اندازه و تعداد، توسط کارشناسان اعلام می‌شود.
              </div>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
