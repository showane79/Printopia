import { Link } from "react-router-dom";
import { useArticles } from "@/admin/lib/publicContent";
import { useSeo } from "@/components/Seo";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { Reveal } from "@/components/Reveal";
import { ArrowLeft, Clock } from "@/components/icons";
import { formatDate, formatNumber } from "@/utils/format";

export default function Blog() {
  const { articles: posts, loading } = useArticles();

  useSeo({
    title: "مجلهٔ پرینتوپیا | راهنما و مقالات چاپ سه‌بعدی",
    description: "مقالات و راهنماهای پرینتوپیا دربارهٔ خرید اکشن فیگور، تفاوت متریال‌ها، سفارش هدیهٔ شخصی‌سازی‌شده و نگهداری محصولات چاپ سه‌بعدی.",
  });

  if (loading)
    return (
      <div className="container-x py-16 text-center text-muted">
        <span className="h-7 w-7 animate-spin rounded-full border-2 border-accent border-t-transparent mx-auto block" />
        <p className="mt-3 text-sm">در حال بارگذاری مقاله‌ها…</p>
      </div>
    );

  if (posts.length === 0)
    return (
      <div className="container-x py-16 text-center">
        <h1 className="text-2xl font-extrabold">مجلهٔ پرینتوپیا</h1>
        <p className="mt-3 text-muted">هنوز مقاله‌ای منتشر نشده است.</p>
        <Link to="/" className="btn btn-primary mt-6">بازگشت به خانه</Link>
      </div>
    );

  const [feature, ...rest] = posts;

  return (
    <div className="container-x py-8">
      <Breadcrumbs items={[{ label: "خانه", to: "/" }, { label: "مجله" }]} />
      <header className="mt-5 max-w-2xl">
        <h1 className="text-2xl font-extrabold md:text-3xl">مجلهٔ پرینتوپیا</h1>
        <p className="mt-2 leading-8 text-muted">راهنما و مقالات کاربردی دربارهٔ چاپ سه‌بعدی، انتخاب متریال و سفارش هدیه‌های خاص.</p>
      </header>

      <Reveal>
        <Link to={`/blog/${feature.slug}`} className="group card mt-8 grid overflow-hidden md:grid-cols-2">
          <div className="relative aspect-[16/10] overflow-hidden md:aspect-auto">
            {feature.image && <img src={feature.image} alt={feature.title} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" loading="lazy" />}
          </div>
          <div className="flex flex-col justify-center p-6 md:p-8">
            <div className="flex items-center gap-3 text-sm text-muted">
              <span className="chip border-accent2/30 bg-accent2/10 text-accent2">{feature.category}</span>
              <span className="flex items-center gap-1"><Clock className="h-4 w-4" /> {formatNumber(feature.readingMinutes)} دقیقه</span>
            </div>
            <h2 className="mt-3 text-2xl font-extrabold leading-tight">{feature.title}</h2>
            <p className="mt-3 leading-8 text-muted">{feature.excerpt}</p>
            <span className="mt-4 inline-flex items-center gap-1 font-bold text-accent transition-all group-hover:gap-2">ادامه مطلب <ArrowLeft className="h-5 w-5" /></span>
          </div>
        </Link>
      </Reveal>

      <div className="mt-6 grid gap-6 md:grid-cols-3">
        {rest.map((a, i) => (
          <Reveal key={a.slug} delay={i * 60}>
            <Link to={`/blog/${a.slug}`} className="group card flex h-full flex-col overflow-hidden transition-all duration-300 hover:-translate-y-1.5 hover:border-accent/40">
              <div className="aspect-[16/10] overflow-hidden">
                {a.image && <img src={a.image} alt={a.title} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" loading="lazy" />}
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
