import { Link } from "react-router-dom";
import { getPublishedArticles } from "@/admin/lib/publicContent";
import { useSeo } from "@/components/Seo";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { Reveal } from "@/components/Reveal";
import { ArrowLeft, Clock } from "@/components/icons";
import { formatDate, formatNumber } from "@/utils/format";

export default function Blog() {
  const all = getPublishedArticles();
  const [feature, ...rest] = all;

  useSeo({
    title: "مجلهٔ پرینتوپیا | راهنما و مقالات چاپ سه‌بعدی",
    description: "مقالات و راهنماهای پرینتوپیا دربارهٔ خرید اکشن فیگور، تفاوت متریال‌ها، سفارش هدیهٔ شخصی‌سازی‌شده و نگهداری محصولات چاپ سه‌بعدی.",
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "Blog",
      name: "مجلهٔ پرینتوپیا",
      blogPost: all.map((a) => ({
        "@type": "BlogPosting",
        headline: a.title,
        datePublished: a.date,
        author: { "@type": "Organization", name: a.author },
      })),
    },
  });

  return (
    <div className="container-x py-8">
      <Breadcrumbs items={[{ label: "خانه", to: "/" }, { label: "مجله" }]} />

      <header className="mt-5 max-w-2xl">
        <h1 className="text-2xl font-extrabold md:text-3xl">مجلهٔ پرینتوپیا</h1>
        <p className="mt-2 leading-8 text-muted">
          راهنما و مقالات کاربردی دربارهٔ چاپ سه‌بعدی، انتخاب متریال و سفارش هدیه‌های خاص.
        </p>
      </header>

      {/* feature */}
      <Reveal>
        <Link to={`/blog/${feature.slug}`} className="group card mt-8 grid overflow-hidden md:grid-cols-2">
          <div className="relative aspect-[16/10] overflow-hidden md:aspect-auto">
            <img src={feature.image} alt={feature.title} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" loading="lazy" />
          </div>
          <div className="flex flex-col justify-center p-6 md:p-8">
            <div className="flex items-center gap-3 text-sm text-muted">
              <span className="chip border-accent2/30 bg-accent2/10 text-accent2">{feature.category}</span>
              <span className="flex items-center gap-1"><Clock className="h-4 w-4" /> {formatNumber(feature.readingMinutes)} دقیقه مطالعه</span>
            </div>
            <h2 className="mt-3 text-2xl font-extrabold leading-tight">{feature.title}</h2>
            <p className="mt-3 leading-8 text-muted">{feature.excerpt}</p>
            <span className="mt-4 inline-flex items-center gap-1 font-bold text-accent transition-all group-hover:gap-2">
              ادامه مطلب <ArrowLeft className="h-5 w-5" />
            </span>
          </div>
        </Link>
      </Reveal>

      {/* grid */}
      <div className="mt-6 grid gap-6 md:grid-cols-3">
        {rest.map((a, i) => (
          <Reveal key={a.slug} delay={i * 60}>
            <Link to={`/blog/${a.slug}`} className="group card flex h-full flex-col overflow-hidden transition-all duration-300 hover:-translate-y-1.5 hover:border-accent/40">
              <div className="aspect-[16/10] overflow-hidden">
                <img src={a.image} alt={a.title} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" loading="lazy" />
              </div>
              <div className="flex flex-1 flex-col p-5">
                <div className="flex items-center justify-between text-sm text-muted">
                  <span className="chip border-accent2/30 bg-accent2/10 text-accent2">{a.category}</span>
                  <span className="flex items-center gap-1 text-xs"><Clock className="h-3.5 w-3.5" /> {formatNumber(a.readingMinutes)}</span>
                </div>
                <h3 className="mt-3 text-lg font-bold leading-7">{a.title}</h3>
                <p className="mt-2 line-clamp-2 text-sm leading-7 text-muted">{a.excerpt}</p>
                <span className="mt-3 text-xs text-muted">{formatDate(a.date)}</span>
              </div>
            </Link>
          </Reveal>
        ))}
      </div>
    </div>
  );
}
