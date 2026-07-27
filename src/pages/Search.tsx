import { useMemo, useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { products, type Product } from "@/data/products";
import { categories } from "@/data/catalog";
import { useSeo } from "@/components/Seo";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { ProductCard } from "@/components/ProductCard";
import { QuickView } from "@/components/QuickView";
import { EmptyState } from "@/components/EmptyState";
import { Search as SearchIcon } from "@/components/icons";

export default function Search() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const q = params.get("q") ?? "";
  const [term, setTerm] = useState(q);
  const [quick, setQuick] = useState<Product | null>(null);
  const [qvOpen, setQvOpen] = useState(false);

  const results = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return [];
    return products.filter((p) => {
      const cat = categories.find((c) => c.id === p.category)?.name ?? "";
      const haystack = [
        p.title,
        p.subtitle,
        p.shortDesc,
        cat,
        String(p.material),
        p.suitableFor.join(" "),
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(needle);
    });
  }, [q]);

  function submit(e: FormEvent) {
    e.preventDefault();
    const t = term.trim();
    if (!t) return;
    navigate(`/search?q=${encodeURIComponent(t)}`);
  }

  useSeo({
    title: q ? `نتایج جستجو برای «${q}» | پرینتوپیا` : "جستجو | پرینتوپیا",
    description: "جستجوی محصولات چاپ سه‌بعدی پرینتوپیا شامل اکشن فیگور، فیگور فانتزی، گلدان، دکوری و هدیه‌های شخصی‌سازی‌شده.",
  });

  return (
    <div className="container-x py-8">
      <Breadcrumbs items={[{ label: "خانه", to: "/" }, { label: "جستجو" }]} />

      <header className="mt-5 max-w-2xl">
        <h1 className="text-2xl font-extrabold md:text-3xl">جستجو در فروشگاه</h1>
        <form onSubmit={submit} role="search" className="relative mt-4">
          <span
            className="pointer-events-none absolute inset-y-0 grid w-11 place-items-center text-muted"
            style={{ insetInlineStart: 0 }}
          >
            <SearchIcon className="h-5 w-5" />
          </span>
          <input
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            type="search"
            autoFocus
            placeholder="نام محصول، دسته یا متریال..."
            aria-label="عبارت جستجو"
            className="input pe-3"
            style={{ paddingInlineStart: "2.75rem" }}
          />
          <button type="submit" className="btn btn-primary absolute inset-y-1.5 my-auto" style={{ insetInlineEnd: "0.375rem" }}>
            جستجو
          </button>
        </form>
      </header>

      <div className="mt-8">
        {q && <p className="mb-5 text-sm text-muted">{results.length.toLocaleString("fa-IR")} نتیجه برای «{q}»</p>}

        {!q ? (
          <EmptyState
            icon={<SearchIcon className="h-7 w-7" />}
            title="چه چیزی را جستجو می‌کنید؟"
            description="عبارت مورد نظر را وارد کنید یا از دسته‌بندی‌های پرطرفدار شروع کنید."
            action={
              <div className="flex flex-wrap justify-center gap-2">
                {categories.slice(0, 6).map((c) => (
                  <Link key={c.id} to={`/shop?cat=${c.id}`} className="chip hover:border-accent">
                    {c.name}
                  </Link>
                ))}
              </div>
            }
          />
        ) : results.length === 0 ? (
          <EmptyState
            icon={<SearchIcon className="h-7 w-7" />}
            title="نتیجه‌ای پیدا نشد"
            description={`برای «${q}» محصولی پیدا نکردیم. عبارت دیگری را امتحان کنید.`}
            action={
              <Link to="/shop" className="btn btn-primary">
                مشاهدهٔ همهٔ محصولات
              </Link>
            }
          />
        ) : (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
            {results.map((p) => (
              <ProductCard key={p.id} product={p} onQuickView={(prod) => { setQuick(prod); setQvOpen(true); }} />
            ))}
          </div>
        )}
      </div>

      <QuickView product={quick} open={qvOpen} onClose={() => setQvOpen(false)} />
    </div>
  );
}
