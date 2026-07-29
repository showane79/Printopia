import { useState } from "react";
import { Link } from "react-router-dom";
import { images } from "@/assets";
import { bentoCategories, collections } from "@/data/catalog";
import { getProducts } from "@/admin/lib/catalog";
import { faqs } from "@/data/faq";
import { useSeo } from "@/components/Seo";
import { Reveal } from "@/components/Reveal";
import { SectionHeading } from "@/components/SectionHeading";
import { ProductCard } from "@/components/ProductCard";
import { CategoryCard } from "@/components/CategoryCard";
import { CollectionCard } from "@/components/CollectionCard";
import { FAQAccordion } from "@/components/FAQAccordion";
import { Newsletter } from "@/components/Newsletter";
import { QuickView } from "@/components/QuickView";
import {
  ArrowLeft,
  Check,
  Cube,
  Layers,
  Palette,
  Shield,
  Sparkles,
  Upload,
} from "@/components/icons";
import { formatPrice } from "@/utils/format";
import { cn } from "@/utils/cn";
import type { Product } from "@/data/products";

const spanClass: Record<string, string> = {
  lg: "col-span-2 row-span-2",
  md: "col-span-2 row-span-1",
  sm: "col-span-1 row-span-1",
};

const whyUs = [
  { icon: Cube, title: "کیفیت چاپ دقیق", text: "چاپ با ضخامت لایهٔ پایین و کنترل کیفیت مرحله‌به‌مرحله." },
  { icon: Layers, title: "متریال قابل انتخاب", text: "PLA، PETG، رزین و TPU را بسته به نیاز انتخاب کنید." },
  { icon: Palette, title: "طراحی و شخصی‌سازی", text: "رنگ، اندازه، نام و طرح دلخواه؛ محصولی فقط برای شما." },
  { icon: Shield, title: "بسته‌بندی امن و ارسال سریع", text: "بسته‌بندی ایمن برای محصولات ظریف و ارسال به سراسر ایران." },
];

const steps = [
  { n: 1, title: "انتخاب یا ثبت طرح", text: "از محصولات آماده انتخاب کنید یا طرح اختصاصی خود را بفرستید." },
  { n: 2, title: "تأیید جزئیات", text: "متریال، رنگ، اندازه و قیمت نهایی تأیید می‌شود." },
  { n: 3, title: "چاپ و کنترل کیفیت", text: "محصول با دقت چاپ و قبل از ارسال کنترل کیفیت می‌شود." },
  { n: 4, title: "بسته‌بندی و ارسال", text: "بسته‌بندی امن و تحویل به شرکت حمل برای رسیدن به شما." },
];

function ConfiguratorPreview() {
  const palette = [
    { name: "بنفش", hex: "#8b5cf6" },
    { name: "فیروزه‌ای", hex: "#22d3ee" },
    { name: "مشکی", hex: "#1c2230" },
    { name: "عاجی", hex: "#e9ecf2" },
  ];
  const sizes = ["کوچک", "متوسط", "بزرگ"];
  const [color, setColor] = useState(palette[0]);
  const [size, setSize] = useState(sizes[1]);
  const [engraving, setEngraving] = useState("");
  const base = 180_000;
  const sizeDelta = size === "کوچک" ? 0 : size === "متوسط" ? 40_000 : 90_000;
  const fee = engraving.trim() ? 40_000 : 0;
  const price = base + sizeDelta + fee;

  return (
    <div className="card overflow-hidden">
      <div className="flex items-center justify-between border-b border-line px-5 py-4">
        <p className="flex items-center gap-2 font-bold">
          <Sparkles className="h-5 w-5 text-accent" /> پیش‌نمایش شخصی‌سازی
        </p>
        <span className="chip border-accent2/30 bg-accent2/10 text-accent2">زنده</span>
      </div>
      <div className="grid gap-5 p-5 md:grid-cols-2">
        <div
          className="relative grid aspect-square place-items-center overflow-hidden rounded-2xl"
          style={{ background: `radial-gradient(circle at 50% 40%, ${color.hex}33, var(--c-surface2))` }}
        >
          <div className="layer-grid absolute inset-0 opacity-40" />
          <Cube className="h-28 w-28 transition-transform duration-500" style={{ color: color.hex }} />
        </div>
        <div className="flex flex-col gap-4">
          <div>
            <p className="mb-2 text-sm font-bold">رنگ</p>
            <div className="flex gap-2">
              {palette.map((c) => (
                <button
                  key={c.name}
                  type="button"
                  onClick={() => setColor(c)}
                  aria-label={c.name}
                  aria-pressed={color.name === c.name}
                  className={cn(
                    "h-9 w-9 rounded-full border-2 transition",
                    color.name === c.name ? "border-accent ring-2 ring-accent/30" : "border-line"
                  )}
                  style={{ backgroundColor: c.hex }}
                />
              ))}
            </div>
          </div>
          <div>
            <p className="mb-2 text-sm font-bold">اندازه</p>
            <div className="flex gap-2">
              {sizes.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSize(s)}
                  aria-pressed={size === s}
                  className={cn(
                    "rounded-xl border px-3 py-1.5 text-sm font-semibold transition",
                    size === s ? "border-accent bg-accent/10 text-accent" : "border-line bg-surface2"
                  )}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label htmlFor="promo-engrave" className="mb-2 block text-sm font-bold">
              حک نام (اختیاری)
            </label>
            <input
              id="promo-engrave"
              className="input"
              maxLength={20}
              placeholder="مثلاً «برای تو»"
              value={engraving}
              onChange={(e) => setEngraving(e.target.value)}
            />
          </div>
          <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-line bg-surface2 px-3 py-3 text-sm text-muted transition hover:border-accent hover:text-accent">
            <Upload className="h-4 w-4" />
            بارگذاری تصویر یا فایل مرجع
          </label>
          <div className="mt-auto flex items-center justify-between rounded-2xl bg-surface2 p-4">
            <span className="text-sm text-muted">قیمت حدودی</span>
            <span className="text-xl font-extrabold">{formatPrice(price)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  const [quick, setQuick] = useState<Product | null>(null);
  const [qvOpen, setQvOpen] = useState(false);
  const bestSellers = getProducts().filter((p) => p.featured).slice(0, 8);
  const homeFaqs = faqs.slice(0, 5);

  useSeo({
    title: "پرینتوپیا | چاپ سه‌بعدی پریمیوم و هدیه‌های شخصی‌سازی‌شده",
    description:
      "خرید آنلاین محصولات چاپ سه‌بعدی: اکشن فیگور، فیگور فانتزی، مجسمه، گلدان، اکسسوری میز کار و هدیه‌های شخصی‌سازی‌شده با چاپ دقیق و متریال باکیفیت.",
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: homeFaqs.map((f) => ({
        "@type": "Question",
        name: f.q,
        acceptedAnswer: { "@type": "Answer", text: f.a },
      })),
    },
  });

  function openQuick(p: Product) {
    setQuick(p);
    setQvOpen(true);
  }

  return (
    <div className="container-x">
      {/* ============ HERO ============ */}
      <section className="relative grid items-center gap-6 py-6 md:grid-cols-2 md:gap-8 md:py-16">
        <div className="pointer-events-none absolute top-0 end-0 -z-10 h-64 w-64 rounded-full bg-accent/15 blur-3xl" />

        <Reveal className="order-2 md:order-1">
          <span className="chip mb-4 border-accent/30 bg-accent/10 text-accent">
            <Sparkles className="h-3.5 w-3.5" /> کلکسیونی، خلاقانه، آینده‌نگر
          </span>
          <h1 className="h-hero font-extrabold">
            محصولات سه‌بعدی خاص، برای <span className="text-gradient">دنیای واقعی</span> شما
          </h1>
          <p className="mt-4 max-w-xl text-base leading-8 text-muted md:text-lg">
            از اکشن فیگورهای کلکسیونی تا هدیه‌های شخصی‌سازی‌شده؛ با دقت بالا و کیفیتی که دیده می‌شود.
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <Link to="/shop" className="btn btn-primary">
              مشاهده محصولات <ArrowLeft className="h-5 w-5" />
            </Link>
            <Link to="/custom" className="btn btn-secondary">
              ساخت محصول سفارشی
            </Link>
          </div>
          <ul className="mt-7 flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted">
            {["چاپ دقیق", "متریال باکیفیت", "امکان شخصی‌سازی"].map((t) => (
              <li key={t} className="flex items-center gap-1.5">
                <Check className="h-4 w-4 text-success" /> {t}
              </li>
            ))}
          </ul>
        </Reveal>

        <Reveal delay={120} className="relative order-1 md:order-2">
          <div className="relative mx-auto max-w-md">
            <div className="absolute inset-0 -z-10 scale-95 rounded-[2rem] bg-gradient-to-br from-accent/30 to-accent2/20 blur-2xl" />
            <div className="card overflow-hidden">
              <img
                src={images.hero}
                alt="اکشن فیگور کلکسیونی چاپ سه‌بعدی پرینتوپیا با نورپردازی بنفش و فیروزه‌ای"
                width={720}
                height={720}
                fetchPriority="high"
                className="aspect-square w-full object-cover"
              />
            </div>
            <div
              className="glass absolute bottom-3 end-3 hidden items-center gap-2 rounded-xl border border-line px-3 py-2 text-xs font-bold sm:flex sm:text-sm"
              style={{ animation: "floaty 4s ease-in-out infinite" }}
            >
              <span className="grid h-7 w-7 place-items-center rounded-lg bg-accent/15 text-accent">
                <Cube className="h-4 w-4" />
              </span>
              رزین · چاپ دقیق
            </div>
            <div
              className="glass absolute top-3 start-3 hidden items-center gap-2 rounded-xl border border-line px-3 py-2 text-xs font-bold sm:flex sm:text-sm"
              style={{ animation: "floaty 5s ease-in-out infinite" }}
            >
              <Sparkles className="h-4 w-4 text-accent2" /> قابل شخصی‌سازی
            </div>
          </div>
        </Reveal>
      </section>

      {/* ============ BENTO CATEGORIES ============ */}
      <section className="py-12 md:py-16">
        <Reveal>
          <SectionHeading
            eyebrow="دسته‌بندی‌ها"
            title="دنیای چاپ سه‌بعدی را کاوش کنید"
            description="از فیگورهای کلکسیونی تا دکوری و هدیه؛ دسته‌ای پیدا کنید که به آن علاقه دارید."
          />
        </Reveal>
        <div className="mt-8 grid auto-rows-[160px] grid-cols-2 gap-3 md:auto-rows-[185px] md:grid-cols-4 md:gap-4">
          {bentoCategories.map((tile, i) => (
            <Reveal key={tile.id} delay={i * 60} className={cn(spanClass[tile.span], "h-full")}>
              <CategoryCard tile={tile} className="h-full" />
            </Reveal>
          ))}
        </div>
      </section>

      {/* ============ BEST SELLERS ============ */}
      <section className="py-12 md:py-16">
        <Reveal>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <SectionHeading
              align="start"
              eyebrow="پرفروش‌ترین‌ها"
              title="محبوب‌ترین محصولات پرینتوپیا"
            />
            <Link to="/shop" className="btn btn-ghost text-accent">
              مشاهده همه <ArrowLeft className="h-5 w-5" />
            </Link>
          </div>
        </Reveal>
        <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
          {bestSellers.map((p, i) => (
            <Reveal key={p.id} delay={(i % 4) * 60}>
              <ProductCard product={p} onQuickView={openQuick} />
            </Reveal>
          ))}
        </div>
      </section>

      {/* ============ CUSTOM CONFIGURATOR PROMO ============ */}
      <section className="py-12 md:py-16">
        <div className="grid items-center gap-8 lg:grid-cols-2">
          <Reveal>
            <span className="chip mb-3 border-accent2/30 bg-accent2/10 text-accent2">شخصی‌سازی</span>
            <h2 className="text-2xl font-extrabold leading-tight md:text-4xl">
              محصولی بسازید که <span className="text-gradient">فقط برای شماست</span>
            </h2>
            <p className="mt-4 max-w-lg leading-8 text-muted">
              رنگ، اندازه، حک نام و متن را خودتان انتخاب کنید و تصویر یا فایل مرجع را بارگذاری نمایید.
              ما ایدهٔ شما را به محصولی واقعی و باکیفیت تبدیل می‌کنیم.
            </p>
            <ul className="mt-5 flex flex-col gap-2 text-sm text-muted">
              {["انتخاب رنگ و اندازه دلخواه", "حک نام، تاریخ یا متن کوتاه", "بارگذاری فایل STL/OBJ یا تصویر مرجع"].map(
                (t) => (
                  <li key={t} className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-success" /> {t}
                  </li>
                )
              )}
            </ul>
            <Link to="/custom" className="btn btn-primary mt-7">
              شروع سفارش اختصاصی <ArrowLeft className="h-5 w-5" />
            </Link>
          </Reveal>
          <Reveal delay={120}>
            <ConfiguratorPreview />
          </Reveal>
        </div>
      </section>

      {/* ============ WHY US ============ */}
      <section className="py-12 md:py-16">
        <Reveal>
          <SectionHeading eyebrow="چرا پرینتوپیا؟" title="کیفیتی که می‌توانید به آن اعتماد کنید" />
        </Reveal>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {whyUs.map((w, i) => (
            <Reveal key={w.title} delay={i * 60}>
              <div className="card h-full p-6 transition-all duration-300 hover:-translate-y-1.5 hover:border-accent/40">
                <span className="mb-4 grid h-12 w-12 place-items-center rounded-xl bg-accent/12 text-accent">
                  <w.icon className="h-6 w-6" />
                </span>
                <h3 className="text-lg font-bold">{w.title}</h3>
                <p className="mt-2 text-sm leading-7 text-muted">{w.text}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ============ COLLECTIONS ============ */}
      <section className="py-12 md:py-16">
        <Reveal>
          <SectionHeading eyebrow="مجموعه‌ها" title="مجموعه‌های محبوب ما" />
        </Reveal>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {collections.map((c, i) => (
            <Reveal key={c.id} delay={i * 60}>
              <CollectionCard collection={c} />
            </Reveal>
          ))}
        </div>
      </section>

      {/* ============ PROCESS ============ */}
      <section className="py-12 md:py-16">
        <Reveal>
          <SectionHeading eyebrow="فرایند تولید" title="سفارش شما چطور ساخته می‌شود؟" />
        </Reveal>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((s, i) => (
            <Reveal key={s.n} delay={i * 70}>
              <div className="card relative h-full p-6">
                <span className="text-5xl font-extrabold text-accent/15">{s.n.toLocaleString("fa-IR")}</span>
                <h3 className="mt-2 text-lg font-bold">{s.title}</h3>
                <p className="mt-2 text-sm leading-7 text-muted">{s.text}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ============ EDUCATIONAL SEO CONTENT ============ */}
      <section className="py-12 md:py-16">
        <Reveal>
          <article className="card p-7 md:p-10">
            <h2 className="text-2xl font-extrabold md:text-3xl">چاپ سه‌بعدی چیست و چرا محصولات آن خاص‌اند؟</h2>
            <div className="mt-4 grid gap-6 text-muted md:grid-cols-2">
              <p className="leading-8">
                چاپ سه‌بعدی فناوری‌ای است که یک مدل دیجیتال را لایه‌لایه به یک جسم فیزیکی تبدیل می‌کند. این روش
                امکان ساخت محصولاتی با جزئیات بالا، فرم‌های پیچیده و کاملاً اختصاصی را فراهم می‌کند؛ از
                اکشن فیگور و مجسمه گرفته تا گلدان و اکسسوری میز کار.
              </p>
              <p className="leading-8">
                انتخاب متریال درست نقش مهمی در کیفیت نهایی دارد: PLA برای دکوری، PETG برای کاربرد و دوام،
                و رزین برای بالاترین جزئیات. با شخصی‌سازی رنگ، اندازه و طرح، می‌توانید محصولی منحصربه‌فرد
                داشته باشید. برای نگهداری بهتر، محصولات را از گرما و شوینده‌های تند دور نگه دارید.
              </p>
            </div>
            <Link to="/blog" className="btn btn-secondary mt-6">
              مطالعهٔ مجلهٔ پرینتوپیا <ArrowLeft className="h-5 w-5" />
            </Link>
          </article>
        </Reveal>
      </section>

      {/* ============ FAQ ============ */}
      <section className="py-12 md:py-16">
        <Reveal>
          <SectionHeading eyebrow="سؤالات متداول" title="پاسخ پرسش‌های پرتکرار" />
        </Reveal>
        <div className="mx-auto mt-8 max-w-3xl">
          <FAQAccordion items={homeFaqs} />
          <div className="mt-6 text-center">
            <Link to="/faq" className="btn btn-ghost text-accent">
              همهٔ سؤالات <ArrowLeft className="h-5 w-5" />
            </Link>
          </div>
        </div>
      </section>

      {/* ============ NEWSLETTER ============ */}
      <section className="py-12 md:py-16">
        <Reveal>
          <Newsletter />
        </Reveal>
      </section>

      <QuickView product={quick} open={qvOpen} onClose={() => setQvOpen(false)} />
    </div>
  );
}
