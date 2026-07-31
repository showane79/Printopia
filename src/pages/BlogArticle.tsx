import { Link, useParams } from "react-router-dom";
import { useArticle } from "@/admin/lib/publicContent";
import { useSeo } from "@/components/Seo";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { ArrowLeft, Check, Clock } from "@/components/icons";
import { formatDate, formatNumber } from "@/utils/format";
import { imgFallback } from "@/utils/img";

export default function BlogArticle() {
  const { slug } = useParams();
  const { article: post, loading } = useArticle(slug);

  useSeo({
    title: post ? `${post.title} | مجلهٔ پرینتوپیا` : "مقاله یافت نشد | پرینتوپیا",
    description: post?.excerpt,
  });

  if (loading)
    return (
      <div className="container-x py-16 text-center text-muted">
        <span className="mx-auto block h-7 w-7 animate-spin rounded-full border-2 border-accent border-t-transparent" />
        <p className="mt-3 text-sm">در حال بارگذاری…</p>
      </div>
    );

  if (!post)
    return (
      <div className="container-x py-16 text-center">
        <h1 className="text-2xl font-extrabold">مقاله پیدا نشد</h1>
        <Link to="/blog" className="btn btn-primary mt-6">بازگشت به مجله</Link>
      </div>
    );

  return (
    <div className="container-x py-8">
      <Breadcrumbs items={[{ label: "خانه", to: "/" }, { label: "مجله", to: "/blog" }, { label: post.title }]} />
      <article className="mx-auto mt-6 max-w-3xl">
        <header>
          <div className="flex flex-wrap items-center gap-3 text-sm text-muted">
            <span className="chip border-accent2/30 bg-accent2/10 text-accent2">{post.category}</span>
            <span>{formatDate(post.date)}</span>
            <span className="flex items-center gap-1"><Clock className="h-4 w-4" /> {formatNumber(post.readingMinutes)} دقیقه مطالعه</span>
          </div>
          <h1 className="mt-3 text-3xl font-extrabold leading-tight md:text-4xl">{post.title}</h1>
          <p className="mt-3 leading-8 text-muted">{post.excerpt}</p>
          <p className="mt-2 text-sm text-muted">توسط {post.author}</p>
        </header>
        {post.image && (
          <div className="card mt-6 overflow-hidden">
            <img {...imgFallback} src={post.image} alt={post.title} className="aspect-[16/9] w-full object-cover" />
          </div>
        )}
        <div className="mt-8">
          {post.content.map((b, i) => (
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
          <Link to="/blog" className="btn btn-secondary"><ArrowLeft className="h-5 w-5" /> بازگشت به مجله</Link>
        </div>
      </article>
    </div>
  );
}
