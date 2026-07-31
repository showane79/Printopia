import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { type Product } from "@/data/products";
import { getCategory } from "@/data/catalog";
import { useProducts } from "@/admin/lib/catalog";
import { useSeo } from "@/components/Seo";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { Filters, type FilterState, PRICE_CEIL } from "@/components/Filters";
import { ProductCard } from "@/components/ProductCard";
import { QuickView } from "@/components/QuickView";
import { EmptyState } from "@/components/EmptyState";
import { Drawer } from "@/components/Drawer";
import { Check, ChevronDown, Filter as FilterIcon, Search as SearchIcon } from "@/components/icons";
import { formatNumber } from "@/utils/format";
import { cn } from "@/utils/cn";

const PAGE_SIZE = 8;

const sortOptions = [
  { value: "newest", label: "جدیدترین" },
  { value: "best", label: "پرفروش‌ترین" },
  { value: "cheap", label: "ارزان‌ترین" },
  { value: "expensive", label: "گران‌ترین" },
];

function SkeletonCard() {
  return (
    <div className="card overflow-hidden">
      <div className="skeleton aspect-square" />
      <div className="space-y-3 p-4">
        <div className="skeleton h-4 w-16 rounded" />
        <div className="skeleton h-5 w-3/4 rounded" />
        <div className="skeleton h-4 w-1/2 rounded" />
        <div className="skeleton h-7 w-24 rounded" />
      </div>
    </div>
  );
}

export default function Shop() {
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const initialCat = params.get("cat") ?? "";
  const initialCustom = params.get("custom") === "1";
  const { products, loading: productsLoading } = useProducts();

  const [filters, setFilters] = useState<FilterState>({
    cats: initialCat ? [initialCat] : [],
    materials: [],
    colors: [],
    suitable: [],
    inStock: false,
    customizable: initialCustom,
    min: 0,
    max: PRICE_CEIL,
  });
  const [sort, setSort] = useState("newest");
  const [visible, setVisible] = useState(PAGE_SIZE);
  const [settling, setSettling] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);
  const [quick, setQuick] = useState<Product | null>(null);
  const [qvOpen, setQvOpen] = useState(false);

  // React to navigation (e.g. clicking a category in the header)
  useEffect(() => {
    const p = new URLSearchParams(location.search);
    const cat = p.get("cat") ?? "";
    const custom = p.get("custom") === "1";
    setFilters((f) => ({ ...f, cats: cat ? [cat] : [], customizable: custom }));
    setVisible(PAGE_SIZE);
  }, [location.search]);

  // Brief settle so filter changes don't flash the grid
  useEffect(() => {
    setSettling(true);
    const t = window.setTimeout(() => setSettling(false), 300);
    return () => window.clearTimeout(t);
  }, [filters, sort]);

  const loading = productsLoading || settling;

  const activeCategory = filters.cats.length === 1 ? getCategory(filters.cats[0]) : undefined;

  const filtered = useMemo(() => {
    let list = products.filter((p) => {
      if (filters.cats.length && !filters.cats.includes(p.category)) return false;
      if (filters.materials.length && !p.materials.some((m) => filters.materials.includes(String(m))))
        return false;
      if (filters.colors.length && !p.colors.some((c) => filters.colors.includes(c.name))) return false;
      if (filters.suitable.length && !p.suitableFor.some((s) => filters.suitable.includes(s))) return false;
      if (filters.inStock && !p.inStock) return false;
      if (filters.customizable && !p.customizable) return false;
      if (p.price < filters.min || p.price > filters.max) return false;
      return true;
    });
    list = [...list].sort((a, b) => {
      switch (sort) {
        case "cheap":
          return a.price - b.price;
        case "expensive":
          return b.price - a.price;
        case "best":
          return Number(b.featured) - Number(a.featured) || b.price - a.price;
        default:
          return 0;
      }
    });
    return list;
  }, [products, filters, sort]);

  const shown = filtered.slice(0, visible);

  useSeo({
    title: activeCategory
      ? `خرید ${activeCategory.name} سه‌بعدی | پرینتوپیا`
      : "فروشگاه محصولات چاپ سه‌بعدی | پرینتوپیا",
    description: activeCategory
      ? `${activeCategory.blurb} خرید آنلاین با چاپ دقیق و متریال باکیفیت از پرینتوپیا.`
      : "خرید آنلاین محصولات چاپ سه‌بعدی: اکشن فیگور، فیگور فانتزی، مجسمه، گلدان، اکسسوری میز و هدیه‌های شخصی‌سازی‌شده.",
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "خانه", item: "https://printopia.example/" },
        { "@type": "ListItem", position: 2, name: "فروشگاه", item: "https://printopia.example/shop" },
      ],
    },
  });

  function change(next: Partial<FilterState>) {
    setFilters((f) => ({ ...f, ...next }));
    setVisible(PAGE_SIZE);
  }
  function reset() {
    setFilters({ cats: [], materials: [], colors: [], suitable: [], inStock: false, customizable: false, min: 0, max: PRICE_CEIL });
    setVisible(PAGE_SIZE);
  }
  function openQuick(p: Product) {
    setQuick(p);
    setQvOpen(true);
  }

  return (
    <div className="container-x py-8">
      <Breadcrumbs
        items={[
          { label: "خانه", to: "/" },
          { label: "فروشگاه", to: "/shop" },
          ...(activeCategory ? [{ label: activeCategory.name }] : []),
        ]}
      />

      <header className="mt-5">
        <h1 className="text-2xl font-extrabold md:text-3xl">
          {activeCategory ? activeCategory.name : "همهٔ محصولات"}
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-7 text-muted">
          {activeCategory
            ? activeCategory.blurb
            : "کلکسیون کامل محصولات چاپ سه‌بعدی پرینتوپیا؛ از فیگورهای کلکسیونی تا دکوری و هدیه‌های سفارشی. با فیلترها، محصول دلخواه خود را سریع پیدا کنید."}
        </p>
      </header>

      <div className="mt-6 grid gap-6 lg:grid-cols-[280px_1fr]">
        {/* desktop sidebar */}
        <aside className="hidden lg:block">
          <div className="card sticky top-24 max-h-[calc(100vh-7rem)] overflow-auto p-5">
            <Filters state={filters} onChange={change} onReset={reset} />
          </div>
        </aside>

        <div>
          {/* toolbar */}
          <div className="mb-5 flex items-center justify-between gap-3">
            <p className="text-sm text-muted">
              {loading ? "در حال بارگذاری..." : `${formatNumber(filtered.length)} محصول`}
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setDrawerOpen(true)}
                className="btn btn-secondary px-3 lg:hidden"
              >
                <FilterIcon className="h-5 w-5" /> فیلترها
              </button>
              <label className="relative">
                <span className="sr-only">مرتب‌سازی</span>
                <select
                  value={sort}
                  onChange={(e) => setSort(e.target.value)}
                  className="input appearance-none pe-9"
                >
                  {sortOptions.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute inset-y-0 my-auto h-4 w-4 text-muted" style={{ insetInlineEnd: "0.75rem" }} />
              </label>
            </div>
          </div>

          {/* grid */}
          {loading ? (
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <SkeletonCard key={i} />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={<SearchIcon className="h-7 w-7" />}
              title="محصولی با این فیلترها پیدا نشد"
              description="فیلترها را تغییر دهید یا بازنشانی کنید تا محصولات بیشتری ببینید."
              action={
                <button type="button" onClick={reset} className="btn btn-primary">
                  بازنشانی فیلترها
                </button>
              }
            />
          ) : (
            <>
              <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
                {shown.map((p) => (
                  <ProductCard key={p.id} product={p} onQuickView={openQuick} />
                ))}
              </div>
              {visible < filtered.length && (
                <div className="mt-8 flex justify-center">
                  <button
                    type="button"
                    onClick={() => setVisible((v) => v + PAGE_SIZE)}
                    className="btn btn-secondary"
                  >
                    نمایش بیشتر ({formatNumber(filtered.length - visible)} محصول دیگر)
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* SEO footer content */}
      <section className="mt-12">
        <div className="card p-6 text-sm leading-8 text-muted md:p-8">
          <h2 className="mb-2 text-lg font-bold text-fg">دربارهٔ خرید محصولات چاپ سه‌بعدی</h2>
          <p>
            در فروشگاه پرینتوپیا، محصولات چاپ سه‌بعدی با دقت بالا و متریال‌های متنوع تولید می‌شوند. با
            استفاده از فیلتر دسته‌بندی، محدودهٔ قیمت، متریال و رنگ، می‌توانید انتخاب دقیق‌تری داشته
            باشید. بسیاری از محصولات قابلیت شخصی‌سازی دارند؛ کافی‌ست در صفحهٔ محصول، رنگ، اندازه و متن
            دلخواه را انتخاب کنید. برای طرح‌های کاملاً اختصاصی نیز می‌توانید به{" "}
            <Link to="/custom" className="text-accent hover:underline">
              صفحهٔ چاپ سه‌بعدی اختصاصی
            </Link>{" "}
            مراجعه کنید.
          </p>
        </div>
      </section>

      {/* mobile filters drawer */}
      <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} side="end" title="فیلترها">
        <Filters state={filters} onChange={change} onReset={reset} />
        <button
          type="button"
          onClick={() => setDrawerOpen(false)}
          className={cn("btn btn-primary mt-5 w-full")}
        >
          مشاهدهٔ {formatNumber(filtered.length)} محصول
        </button>
      </Drawer>

      {/* mobile sticky filter / sort bar */}
      <div className="bottom-bar lg:hidden">
        <div className="glass flex items-center gap-2 border-t border-line p-2 shadow-[0_-8px_24px_-12px_rgba(0,0,0,0.6)]">
          <button type="button" onClick={() => setDrawerOpen(true)} className="btn btn-secondary flex-1">
            <FilterIcon className="h-5 w-5" /> فیلتر
          </button>
          <button type="button" onClick={() => setSortOpen(true)} className="btn btn-secondary flex-1">
            مرتب‌سازی
          </button>
        </div>
      </div>

      {/* mobile sort drawer */}
      <Drawer open={sortOpen} onClose={() => setSortOpen(false)} side="end" title="مرتب‌سازی">
        <div className="flex flex-col gap-1">
          {sortOptions.map((o) => (
            <button
              key={o.value}
              type="button"
              onClick={() => {
                setSort(o.value);
                setSortOpen(false);
              }}
              className={cn(
                "touch flex items-center justify-between rounded-xl px-3 py-3 font-bold",
                sort === o.value ? "bg-accent/10 text-accent" : "hover:bg-surface2"
              )}
            >
              {o.label} {sort === o.value && <Check className="h-5 w-5" />}
            </button>
          ))}
        </div>
      </Drawer>

      <QuickView product={quick} open={qvOpen} onClose={() => setQvOpen(false)} />
    </div>
  );
}
