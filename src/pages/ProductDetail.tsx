import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useProductBySlug, useRelatedProducts, useProducts } from "@/admin/lib/catalog";
import { getCategory } from "@/data/catalog";
import { faqs } from "@/data/faq";
import { useStore } from "@/context/StoreContext";
import { useSeo } from "@/components/Seo";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { ProductCustomizer } from "@/components/ProductCustomizer";
import { ProductCard } from "@/components/ProductCard";
import { QuickView } from "@/components/QuickView";
import { RatingStars } from "@/components/RatingStars";
import { SectionHeading } from "@/components/SectionHeading";
import { FAQAccordion } from "@/components/FAQAccordion";
import { Badge } from "@/components/Badge";
import { Cart, Check, ChevronDown, Eye, Truck } from "@/components/icons";
import { defaultOptions } from "@/utils/product";
import { formatPrice, discountPercent, toPersianDigits } from "@/utils/format";
import { cn } from "@/utils/cn";
import type { Product } from "@/data/products";

const tabs = [
  { id: "desc", label: "توضیحات" },
  { id: "specs", label: "مشخصات" },
  { id: "care", label: "راهنمای نگهداری" },
  { id: "shipping", label: "ارسال و مرجوعی" },
] as const;
type TabId = (typeof tabs)[number]["id"];

export default function ProductDetail() {
  const { slug } = useParams();
  const { product, loading } = useProductBySlug(slug);
  const { products } = useProducts();
  const { recentlyViewed, addRecentlyViewed, addToCart } = useStore();
  const [activeTab, setActiveTab] = useState<TabId>("desc");
  const [zoom, setZoom] = useState({ x: 50, y: 50, active: false });
  const [spin360, setSpin360] = useState(false);
  const [quick, setQuick] = useState<Product | null>(null);
  const [qvOpen, setQvOpen] = useState(false);

  useEffect(() => {
    if (product) addRecentlyViewed(product.id);
    setActiveTab("desc");
    setSpin360(false);
  }, [product, addRecentlyViewed]);

  const discount = product ? discountPercent(product.price, product.oldPrice) : null;
  const related = useRelatedProducts(product, 4);
  const recent = useMemo(
    () =>
      recentlyViewed
        .map((id) => products.find((p) => p.id === id))
        .filter((p): p is Product => !!p && p.id !== product?.id)
        .slice(0, 4),
    [products, recentlyViewed, product]
  );

  useSeo({
    title: product ? `${product.title} | پرینتوپیا` : "محصول یافت نشد | پرینتوپیا",
    description: product?.shortDesc,
    jsonLd: product
      ? {
          "@context": "https://schema.org",
          "@type": "Product",
          name: product.title,
          image: `https://printopia.example${product.image}`,
          description: product.description,
          sku: product.id.toUpperCase(),
          category: getCategory(product.category)?.name,
          brand: { "@type": "Brand", name: "پرینتوپیا" },
          offers: {
            "@type": "Offer",
            url: `https://printopia.example/product/${product.slug}`,
            priceCurrency: "IRR",
            price: product.price,
            availability: product.inStock
              ? "https://schema.org/InStock"
              : "https://schema.org/OutOfStock",
          },
        }
      : undefined,
  });

  if (loading) {
    return (
      <div className="container-x py-16 text-center text-muted">
        <span className="mx-auto block h-7 w-7 animate-spin rounded-full border-2 border-accent border-t-transparent" />
        <p className="mt-3 text-sm">در حال بارگذاری محصول…</p>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="container-x py-16 text-center">
        <h1 className="text-2xl font-extrabold">محصول مورد نظر پیدا نشد</h1>
        <p className="mt-3 text-muted">ممکن است این محصول حذف شده یا آدرس اشتباه باشد.</p>
        <Link to="/shop" className="btn btn-primary mt-6">
          بازگشت به فروشگاه
        </Link>
      </div>
    );
  }

  const category = getCategory(product.category);

  function onMove(e: React.MouseEvent<HTMLDivElement>) {
    if (spin360) return;
    const r = e.currentTarget.getBoundingClientRect();
    setZoom({
      x: ((e.clientX - r.left) / r.width) * 100,
      y: ((e.clientY - r.top) / r.height) * 100,
      active: true,
    });
  }

  function tabContent(id: TabId) {
    switch (id) {
      case "desc":
        return (
          <div className="grid gap-6 md:grid-cols-3">
            <p className="leading-8 text-muted md:col-span-2">{product!.description}</p>
            <ul className="flex flex-col gap-2">
              {product!.features.map((f) => (
                <li key={f} className="flex items-center gap-2 text-sm">
                  <Check className="h-4 w-4 shrink-0 text-accent" /> {f}
                </li>
              ))}
            </ul>
          </div>
        );
      case "specs":
        return (
          <div className="overflow-hidden rounded-xl border border-line">
            <table className="w-full text-sm">
              <tbody>
                {product!.specs.map((s, i) => (
                  <tr key={s.label} className={cn(i % 2 === 0 && "bg-surface2/50")}>
                    <th scope="row" className="p-3 text-start font-semibold text-muted">
                      {s.label}
                    </th>
                    <td className="p-3">{s.value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      case "care":
        return <p className="leading-8 text-muted">{product!.care}</p>;
      case "shipping":
        return (
          <div className="space-y-3 text-muted">
            <p className="flex items-center gap-2">
              <Truck className="h-5 w-5 text-accent" /> ارسال به سراسر ایران از طریق شرکت‌های حمل معتبر.
            </p>
            <p className="leading-8">
              زمان آماده‌سازی این محصول حدود {toPersianDigits(product!.productionDays)} روز کاری است. برای
              سفارش‌های بالای ۵۰۰٬۰۰۰ تومان ارسال رایگان است. محصولات آماده در صورت نقص قابل تعویض یا
              مرجوع هستند؛ محصولات کاملاً شخصی‌سازی‌شده تنها در صورت نقص تولید قابل بازگشت می‌باشند.
            </p>
            <Link to="/shipping" className="inline-block text-accent hover:underline">
              مطالعهٔ کامل سیاست ارسال و مرجوعی
            </Link>
          </div>
        );
    }
  }

  return (
    <div className="container-x pt-8 pb-28 lg:pb-8">
      <Breadcrumbs
        items={[
          { label: "خانه", to: "/" },
          { label: "فروشگاه", to: "/shop" },
          { label: category?.name ?? "محصول", to: `/shop?cat=${product.category}` },
          { label: product.title },
        ]}
      />

      <div className="mt-6 grid gap-8 lg:grid-cols-2">
        {/* gallery */}
        <div>
          <div
            className="card relative aspect-square overflow-hidden bg-surface2"
            onMouseMove={onMove}
            onMouseLeave={() => setZoom((z) => ({ ...z, active: false }))}
          >
            <img
              src={product.image}
              alt={product.title}
              style={{
                transformOrigin: `${zoom.x}% ${zoom.y}%`,
                transform: zoom.active ? "scale(1.7)" : "scale(1)",
                transition: "transform 0.2s ease",
              }}
              className="h-full w-full object-cover"
            />
            <div className="absolute start-3 top-3 flex flex-col gap-1.5">
              {product.badge && <Badge variant="accent">{product.badge}</Badge>}
              {discount !== null && <Badge variant="danger">{toPersianDigits(discount)}٪ تخفیف</Badge>}
            </div>
            <span className="glass absolute bottom-3 start-3 hidden items-center gap-1 rounded-lg border border-line px-2 py-1 text-xs text-muted md:flex">
              <Eye className="h-3.5 w-3.5" /> برای بزرگنمایی نشانگر را حرکت دهید
            </span>
          </div>
          <div className="mt-3 grid grid-cols-4 gap-3">
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className={cn(
                  "aspect-square overflow-hidden rounded-xl border bg-surface2",
                  i === 0 ? "border-accent" : "border-line opacity-70"
                )}
              >
                <img src={product.image} alt="" className="h-full w-full object-cover" loading="lazy" />
              </div>
            ))}
          </div>
        </div>

        {/* info + customizer */}
        <div className="flex flex-col gap-5">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="neutral">{category?.name}</Badge>
              {product.customizable && <Badge variant="accent2">قابل شخصی‌سازی</Badge>}
            </div>
            <h1 className="mt-3 text-2xl font-extrabold leading-tight md:text-3xl">{product.title}</h1>
            <p className="mt-1 text-muted">{product.subtitle}</p>
            <div className="mt-3">
              <RatingStars />
            </div>
          </div>

          {/* price — prominent on mobile (sticky bar mirrors it) */}
          <div className="flex flex-wrap items-baseline gap-3">
            <span className="text-2xl font-extrabold md:text-3xl">{formatPrice(product.price)}</span>
            {product.oldPrice && (
              <span className="text-base text-muted line-through md:text-lg">
                {formatPrice(product.oldPrice)}
              </span>
            )}
          </div>

          <ProductCustomizer product={product} />

          <ul className="grid grid-cols-1 gap-2 text-sm text-muted sm:grid-cols-2">
            {product.features.map((f) => (
              <li key={f} className="flex items-center gap-2">
                <Check className="h-4 w-4 shrink-0 text-success" /> {f}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* details: desktop tabs / mobile accordions */}
      <div className="mt-10 scroll-mt-28 md:mt-12" id="details">
        <div className="hidden flex-wrap gap-2 border-b border-line md:flex">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setActiveTab(t.id)}
              aria-selected={activeTab === t.id}
              className={cn(
                "border-b-2 px-4 py-3 text-sm font-bold transition-colors",
                activeTab === t.id ? "border-accent text-fg" : "border-transparent text-muted hover:text-fg"
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="card hidden p-6 md:block md:p-8">{tabContent(activeTab)}</div>

        <div className="flex flex-col gap-2 md:hidden">
          {tabs.map((t) => (
            <details key={t.id} className="card overflow-hidden" open={t.id === "desc"}>
              <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3.5 font-bold">
                {t.label}
                <ChevronDown className="h-5 w-5 text-accent transition-transform" />
              </summary>
              <div className="border-t border-line p-4">{tabContent(t.id)}</div>
            </details>
          ))}
        </div>
      </div>

      {/* related */}
      <section className="mt-12 scroll-mt-28">
        <SectionHeading align="start" title="محصولات مرتبط" />
        <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4">
          {related.map((p) => (
            <ProductCard key={p.id} product={p} onQuickView={(prod) => { setQuick(prod); setQvOpen(true); }} />
          ))}
        </div>
      </section>

      {/* recently viewed */}
      {recent.length > 0 && (
        <section className="mt-12 scroll-mt-28">
          <SectionHeading align="start" title="اخیراً دیده‌شده" />
          <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4">
            {recent.map((p) => (
              <ProductCard key={p.id} product={p} onQuickView={(prod) => { setQuick(prod); setQvOpen(true); }} />
            ))}
          </div>
        </section>
      )}

      {/* product FAQ */}
      <section className="mt-12 scroll-mt-28">
        <SectionHeading align="start" title="سؤالات این محصول" />
        <div className="mt-6 max-w-3xl">
          <FAQAccordion items={faqs.slice(0, 4)} />
        </div>
      </section>

      {/* sticky mobile purchase bar */}
      {product.inStock && (
        <div className="bottom-bar lg:hidden">
          <div className="glass flex items-center gap-3 border-t border-line px-3 py-2.5 shadow-[0_-8px_24px_-12px_rgba(0,0,0,0.6)]">
            <div className="minw-0 flex-1">
              <div className="truncate text-xs text-muted">{product.title}</div>
              <div className="font-extrabold">{formatPrice(product.price)}</div>
            </div>
            <button
              type="button"
              onClick={() => addToCart(product, defaultOptions(product))}
              className="btn btn-primary shrink-0"
            >
              <Cart className="h-5 w-5" /> افزودن به سبد
            </button>
          </div>
        </div>
      )}

      <QuickView product={quick} open={qvOpen} onClose={() => setQvOpen(false)} />
    </div>
  );
}
