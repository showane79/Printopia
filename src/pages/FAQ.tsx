import { useState } from "react";
import { Link } from "react-router-dom";
import { faqs, faqGroups } from "@/data/faq";
import { useSeo } from "@/components/Seo";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { FAQAccordion } from "@/components/FAQAccordion";
import { ArrowLeft, Search as SearchIcon } from "@/components/icons";

export default function FAQ() {
  const [q, setQ] = useState("");
  const needle = q.trim();
  const match = (text: string) => !needle || text.includes(needle);
  const filtered = faqs.filter((f) => match(f.q) || match(f.a));

  useSeo({
    title: "سؤالات متداول | پرینتوپیا",
    description: "پاسخ پرسش‌های پرتکرار دربارهٔ محصولات چاپ سه‌بعدی، متریال، زمان تولید، سفارش اختصاصی، ارسال و مرجوعی.",
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: faqs.map((f) => ({
        "@type": "Question",
        name: f.q,
        acceptedAnswer: { "@type": "Answer", text: f.a },
      })),
    },
  });

  return (
    <div className="container-x py-8">
      <Breadcrumbs items={[{ label: "خانه", to: "/" }, { label: "سؤالات متداول" }]} />

      <header className="mx-auto mt-5 max-w-2xl text-center">
        <h1 className="text-2xl font-extrabold md:text-3xl">سؤالات متداول</h1>
        <p className="mt-2 leading-8 text-muted">
          پاسخ پرسش‌های رایج دربارهٔ محصولات، سفارش اختصاصی، ارسال و مرجوعی را اینجا پیدا کنید.
        </p>
        <div className="relative mx-auto mt-5 max-w-md">
          <span className="pointer-events-none absolute inset-y-0 grid w-10 place-items-center text-muted" style={{ insetInlineStart: 0 }}>
            <SearchIcon className="h-5 w-5" />
          </span>
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="input pe-3"
            style={{ paddingInlineStart: "2.5rem" }}
            placeholder="جستجو در سؤالات..."
            aria-label="جستجو در سؤالات متداول"
          />
        </div>
      </header>

      <div className="mx-auto mt-10 max-w-3xl space-y-8">
        {needle && filtered.length === 0 ? (
          <div className="card p-8 text-center text-muted">
            نتیجه‌ای برای «{needle}» پیدا نشد.
          </div>
        ) : (
          faqGroups.map((group) => {
            const items = (needle ? filtered : faqs).filter((f) => f.group === group);
            if (items.length === 0) return null;
            return (
              <section key={group}>
                <h2 className="mb-3 text-lg font-extrabold text-accent">{group}</h2>
                <FAQAccordion items={items} />
              </section>
            );
          })
        )}
      </div>

      <div className="mx-auto mt-12 max-w-3xl">
        <div className="card p-6 text-center">
          <h2 className="text-lg font-extrabold">پاسخ سؤالتان را پیدا نکردید؟</h2>
          <p className="mt-2 text-sm text-muted">تیم پشتیبانی پرینتوپیا خوشحال می‌شود کمک کند.</p>
          <Link to="/contact" className="btn btn-primary mt-4">
            تماس با ما <ArrowLeft className="h-5 w-5" />
          </Link>
        </div>
      </div>
    </div>
  );
}
