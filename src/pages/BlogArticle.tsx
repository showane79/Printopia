import { Link, useParams } from "react-router-dom";
import { getPublicArticle, getPublishedArticles } from "@/admin/lib/publicContent";
import { useSeo } from "@/components/Seo";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { ArrowLeft, Check, Clock } from "@/components/icons";
import { formatDate, formatNumber } from "@/utils/format";

export default function BlogArticle() {
  const { slug } = useParams();
  const article = slug ? getPublicArticle(slug) : undefined;

  useSeo({
    title: article ? `${article.title} | مجلهٔ پرینتوپیا` : "مقاله یافت نشد | پرینتوپیا",
    description: article?.excerpt,
    jsonLd: article
      ? {
          "@context": "https://schema.org",
          "@type": "BlogPosting",
          headline: article.title,
          image: article.image ? `https://printopia.example${article.image}` : undefined,
          datePublished: article.date,
          dateModified: article.date,
          author: { "@type": "Organization", name: article.author },
          publisher: { "@type": "Organization", name: "پرینتوپیا" },
          description: article.excerpt,
        }
      : undefined,
  });

  if (!article) {
    return (
      <div className="container-x py-16 text-center">
        <h1 className="text-2xl font-extrabold">مقاله پیدا نشد</h1>
        <Link to="/blog" className="btn btn-primary mt-6">بازگشت به مجله</Link>
      </div>
    );
  }

  const related = getPublishedArticles().filter((a) => a.slug !== article.slug).slice(0, 3);

  return (
    <div className="container-x py-8">
      <Breadcrumbs items={[{ label: "خانه", to: "/" }, { label: "مجله", to: "/blog" }, { label: article.title }]} />

      <article className="mx-auto mt-6 max-w-3xl">
        <header>
          <div className="flex flex-wrap items-center gap-3 text-sm text-muted">
            <span className="chip border-accent2/30 bg-accent2/10 text-accent2">{article.category}</span>
            <span>{formatDate(article.date)}</span>
            <span className="flex items-center gap-1"><Clock className="h-4 w-4" /> {formatNumber(article.readingMinutes)} دقیقه مطالعه</span>
          </div>
          <h1 className="mt-3 text-3xl font-extrabold leading-tight md:text-4xl">{article.title}</h1>
          <p className="mt-3 leading-8 text-muted">{article.excerpt}</p>
          <p className="mt-2 text-sm text-muted">توسط {article.author}</p>
        </header>

        {article.image && (
          <div className="card mt-6 overflow-hidden">
            <img src={article.image} alt={article.title} className="aspect-[16/9] w-full object-cover" />
          </div>
        )}

        <div className="mt-8">
          {article.content.map((b, i) => (
            <div key={i}>
              {b.h && <h2 className="mt-8 text-xl font-extrabold">{b.h}</h2>}
              {b.p && <p className="mt-3 leading-9 text-muted">{b.p}</p>}
              {b.list && (
                <ul className="mt-3 space-y-2">
                  {b.list.map((li, j) => (
                    <li key={j} className="flex items-start gap-2 leading-8 text-muted">
                      <Check className="mt-1.5 h-4 w-4 shrink-0 text-success" /> {li}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>

        <div className="mt-10 border-t border-line pt-6">
          <Link to="/blog" className="btn btn-secondary">
            <ArrowLeft className="h-5 w-5" /> بازگشت به مجله
          </Link>
        </div>
      </article>

      <section className="mx-auto mt-12 max-w-5xl">
        <h2 className="mb-5 text-xl font-extrabold">مطالب مرتبط</h2>
        <div className="grid gap-6 md:grid-cols-3">
          {related.map((a) => (
            <Link key={a.slug} to={`/blog/${a.slug}`} className="group card overflow-hidden transition-all duration-300 hover:-translate-y-1.5 hover:border-accent/40">
              <div className="aspect-[16/10] overflow-hidden">
                <img src={a.image} alt={a.title} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" loading="lazy" />
              </div>
              <div className="p-5">
                <span className="chip border-accent2/30 bg-accent2/10 text-accent2">{a.category}</span>
                <h3 className="mt-2 font-bold leading-7">{a.title}</h3>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
