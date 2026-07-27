import { Link } from "react-router-dom";
import { images } from "@/assets";
import { useSeo } from "@/components/Seo";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { Reveal } from "@/components/Reveal";
import { SectionHeading } from "@/components/SectionHeading";
import { ArrowLeft, Cube, Palette, Shield, Sparkles, Truck } from "@/components/icons";
import { formatNumber } from "@/utils/format";

const values = [
  { icon: Cube, title: "کیفیت بی‌گذشت", text: "هر محصول با کنترل کیفیت مرحله‌به‌مرحاله تولید می‌شود." },
  { icon: Palette, title: "خلاقیت و شخصی‌سازی", text: "معتقدیم هر مشتری، محصولی منحصربه‌فرد دارد." },
  { icon: Shield, title: "اعتماد و شفافیت", text: "اطلاعات دقیق محصول، قیمت و زمان تحویل شفاف است." },
  { icon: Truck, title: "ارسال مطمئن", text: "بسته‌بندی امن و ارسال به سراسر ایران." },
];

const stats = [
  { value: 12, suffix: "+", label: "دستهٔ محصول" },
  { value: 100, suffix: "٪", label: "تولید با چاپ سه‌بعدی" },
  { value: 5, suffix: " سال", label: "تجربهٔ تیم" },
  { value: 7, suffix: " روز", label: "حداکثر آماده‌سازی" },
];

export default function About() {
  useSeo({
    title: "درباره ما | پرینتوپیا",
    description: "پرینتوپیا، برند تخصصی محصولات چاپ سه‌بعدی؛ ایده‌ها را به واقعیت سه‌بعدی تبدیل می‌کنیم.",
  });

  return (
    <div className="container-x py-8">
      <Breadcrumbs items={[{ label: "خانه", to: "/" }, { label: "درباره ما" }]} />

      {/* hero */}
      <section className="mt-6 grid items-center gap-8 md:grid-cols-2">
        <Reveal>
          <span className="chip mb-3 border-accent/30 bg-accent/10 text-accent">
            <Sparkles className="h-3.5 w-3.5" /> داستان پرینتوپیا
          </span>
          <h1 className="text-3xl font-extrabold leading-tight md:text-4xl">
            ایده‌ها را به <span className="text-gradient">واقعیت سه‌بعدی</span> تبدیل می‌کنیم
          </h1>
          <p className="mt-5 leading-8 text-muted">
            پرینتوپیا با عشق به فناوری چاپ سه‌بعدی و طراحی شکل گرفت. هدف ما ساختن محصولاتی است که
            خاص، خلاقانه و باکیفیت باشند؛ از اکشن فیگورهای کلکسیونی تا هدیه‌های شخصی‌سازی‌شده. ما باور
            داریم که هر ایده‌ای، ارزش ساخته‌شدن دارد.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link to="/shop" className="btn btn-primary">مشاهده محصولات <ArrowLeft className="h-5 w-5" /></Link>
            <Link to="/custom" className="btn btn-secondary">سفارش اختصاصی</Link>
          </div>
        </Reveal>
        <Reveal delay={120}>
          <div className="card overflow-hidden">
            <img src={images.fantasyFigure} alt="نمونه‌ای از محصولات چاپ سه‌بعدی پرینتوپیا" className="aspect-[4/3] w-full object-cover" loading="lazy" />
          </div>
        </Reveal>
      </section>

      {/* stats */}
      <section className="mt-12 grid grid-cols-2 gap-4 md:grid-cols-4">
        {stats.map((s, i) => (
          <Reveal key={s.label} delay={i * 60}>
            <div className="card p-5 text-center">
              <p className="text-3xl font-extrabold text-gradient">
                {formatNumber(s.value)}{s.suffix}
              </p>
              <p className="mt-1 text-sm text-muted">{s.label}</p>
            </div>
          </Reveal>
        ))}
      </section>

      {/* values */}
      <section className="mt-16">
        <Reveal>
          <SectionHeading eyebrow="ارزش‌های ما" title="با چه باوری کار می‌کنیم" />
        </Reveal>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {values.map((v, i) => (
            <Reveal key={v.title} delay={i * 60}>
              <div className="card h-full p-6 transition-all duration-300 hover:-translate-y-1.5 hover:border-accent/40">
                <span className="mb-4 grid h-12 w-12 place-items-center rounded-xl bg-accent/12 text-accent">
                  <v.icon className="h-6 w-6" />
                </span>
                <h3 className="text-lg font-bold">{v.title}</h3>
                <p className="mt-2 text-sm leading-7 text-muted">{v.text}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="mt-16">
        <Reveal>
          <div className="card overflow-hidden p-8 text-center md:p-12">
            <h2 className="text-2xl font-extrabold md:text-3xl">آماده‌اید ایدهٔ خود را بسازید؟</h2>
            <p className="mx-auto mt-3 max-w-xl leading-8 text-muted">
              چه محصول آماده بخواهید و چه طرح کاملاً اختصاصی، ما کنار شما هستیم تا بهترین نتیجه را بگیرید.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Link to="/custom" className="btn btn-primary">شروع سفارش اختصاصی</Link>
              <Link to="/contact" className="btn btn-secondary">تماس با ما</Link>
            </div>
          </div>
        </Reveal>
      </section>
    </div>
  );
}
