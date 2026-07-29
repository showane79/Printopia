import { useState, type FormEvent } from "react";
import { site } from "@/data/site";
import { useStore } from "@/context/StoreContext";
import { useSeo } from "@/components/Seo";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { Clock, Instagram, Mail, MapPin, Phone, Send } from "@/components/icons";

export default function Contact() {
  const { pushToast } = useStore();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [form, setForm] = useState({ name: "", email: "", subject: "", message: "" });

  function submit(e: FormEvent) {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!form.name.trim()) errs.name = "نام خود را وارد کنید.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errs.email = "ایمیل معتبر وارد کنید.";
    if (form.message.trim().length < 10) errs.message = "پیام شما باید حداقل ۱۰ نویسه باشد.";
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setForm({ name: "", email: "", subject: "", message: "" });
    pushToast("پیام شما ارسال شد. به‌زودی پاسخ می‌دهیم ✦");
  }

  useSeo({
    title: "تماس با ما | پرینتوپیا",
    description: "با تیم پرینتوپیا در تماس باشید؛ تلفن، ایمیل، آدرس و فرم تماس برای پشتیبانی و سفارش اختصاصی.",
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "ContactPage",
      name: "تماس با پرینتوپیا",
    },
  });

  const info = [
    { icon: Phone, label: "تلفن تماس", value: site.phone, href: site.phoneHref, ltr: true },
    { icon: Mail, label: "ایمیل", value: site.email, href: `mailto:${site.email}`, ltr: true },
    { icon: MapPin, label: "آدرس", value: site.address },
    { icon: Clock, label: "ساعات کاری", value: site.workingHours },
  ];

  return (
    <div className="container-x py-8">
      <Breadcrumbs items={[{ label: "خانه", to: "/" }, { label: "تماس با ما" }]} />
      <header className="mt-5 max-w-2xl">
        <h1 className="text-2xl font-extrabold md:text-3xl">با ما در تماس باشید</h1>
        <p className="mt-2 leading-8 text-muted">
          سؤال، پیشنهاد یا ایدهٔ خاصی دارید؟ خوشحال می‌شویم بشنویم. تیم پشتیبانی پرینتوپیا در سریع‌ترین
          زمان پاسخگوی شماست.
        </p>
      </header>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_420px]">
        {/* info */}
        <div className="grid gap-4 sm:grid-cols-2">
          {info.map((it) => (
            <div key={it.label} className="card p-5">
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-accent/12 text-accent">
                <it.icon className="h-6 w-6" />
              </span>
              <p className="mt-3 text-sm text-muted">{it.label}</p>
              {it.href ? (
                <a href={it.href} className="font-bold hover:text-accent" dir={it.ltr ? "ltr" : undefined}>
                  {it.value}
                </a>
              ) : (
                <p className="font-bold leading-7">{it.value}</p>
              )}
            </div>
          ))}
          <div className="card p-5 sm:col-span-2">
            <p className="mb-3 text-sm font-bold">ما را در شبکه‌های اجتماعی دنبال کنید</p>
            <div className="flex gap-2">
              <a href={site.social.instagram} target="_blank" rel="noopener noreferrer" aria-label="اینستاگرام" className="grid h-10 w-10 place-items-center rounded-xl border border-line bg-surface2 hover:border-accent hover:text-accent">
                <Instagram className="h-5 w-5" />
              </a>
              <a href={site.social.telegram} target="_blank" rel="noopener noreferrer" aria-label="تلگرام" className="grid h-10 w-10 place-items-center rounded-xl border border-line bg-surface2 hover:border-accent hover:text-accent">
                <Send className="h-5 w-5" />
              </a>
            </div>
          </div>
        </div>

        {/* form */}
        <div className="card p-6">
          <h2 className="text-lg font-extrabold">فرم تماس</h2>
          <form onSubmit={submit} className="mt-4 space-y-4" noValidate>
            <div>
              <label htmlFor="c-name" className="mb-2 block text-sm font-bold">نام و نام خانوادگی</label>
              <input id="c-name" className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              {errors.name && <p role="alert" className="mt-1.5 text-sm text-danger">{errors.name}</p>}
            </div>
            <div>
              <label htmlFor="c-email" className="mb-2 block text-sm font-bold">ایمیل</label>
              <input id="c-email" dir="ltr" className="input text-start" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              {errors.email && <p role="alert" className="mt-1.5 text-sm text-danger">{errors.email}</p>}
            </div>
            <div>
              <label htmlFor="c-subject" className="mb-2 block text-sm font-bold">موضوع</label>
              <input id="c-subject" className="input" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} />
            </div>
            <div>
              <label htmlFor="c-msg" className="mb-2 block text-sm font-bold">پیام شما</label>
              <textarea id="c-msg" rows={4} className="input resize-y" value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} />
              {errors.message && <p role="alert" className="mt-1.5 text-sm text-danger">{errors.message}</p>}
            </div>
            <button type="submit" className="btn btn-primary w-full">ارسال پیام</button>
          </form>
        </div>
      </div>
    </div>
  );
}
