import { Link } from "react-router-dom";
import type { Product } from "@/data/products";
import { materials } from "@/data/products";
import { useStore } from "@/context/StoreContext";
import { RatingStars } from "@/components/RatingStars";
import { Cart, Eye, Heart } from "@/components/icons";
import { defaultOptions } from "@/utils/product";
import { formatPrice, toPersianDigits } from "@/utils/format";
import { imgFallback } from "@/utils/img";
import { cn } from "@/utils/cn";

export function ProductCard({
  product,
  onQuickView,
}: {
  product: Product;
  onQuickView?: (p: Product) => void;
}) {
  const { addToCart, toggleWishlist, isWishlisted } = useStore();
  const wished = isWishlisted(product.id);

  // One meaningful badge only (priority: explicit badge > customizable)
  const badgeText = product.badge
    ? product.badge === "ویژه"
      ? "پرفروش"
      : product.badge
    : product.customizable
    ? "قابل شخصی‌سازی"
    : null;

  return (
    <article className="group card flex minw-0 flex-col overflow-hidden transition-all duration-300 hover:-translate-y-1.5 hover:border-accent/40">
      <div className="relative aspect-square overflow-hidden bg-surface2">
        <Link to={`/product/${product.slug}`} aria-label={product.title} className="block h-full w-full">
          <img
            {...imgFallback}
            src={product.image}
            alt={`تصویر ${product.title}`}
            width={600}
            height={600}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        </Link>

        {badgeText && (
          <span className="absolute start-2 top-2 rounded-full bg-accent/90 px-2 py-0.5 text-[11px] font-bold text-white shadow sm:start-3 sm:top-3">
            {badgeText}
          </span>
        )}

        <button
          type="button"
          onClick={() => toggleWishlist(product)}
          aria-pressed={wished}
          aria-label={wished ? "حذف از علاقه‌مندی‌ها" : "افزودن به علاقه‌مندی‌ها"}
          className={cn(
            "touch absolute end-2 top-2 grid h-9 w-9 place-items-center rounded-full border backdrop-blur transition sm:end-3 sm:top-3",
            wished ? "border-accent bg-accent/20 text-accent" : "border-line bg-black/25 text-white hover:text-accent"
          )}
        >
          <Heart filled={wished} className="h-4.5 w-4.5" />
        </button>

        {!product.inStock && (
          <div className="absolute inset-0 grid place-items-center bg-canvas/65">
            <span className="chip border-line bg-surface2">ناموجود</span>
          </div>
        )}

        {/* Quick view: desktop only, subtle */}
        {product.inStock && onQuickView && (
          <button
            type="button"
            onClick={() => onQuickView(product)}
            aria-label="مشاهده سریع"
            className="touch absolute bottom-2 start-2 hidden h-9 w-9 place-items-center rounded-full border border-line bg-black/30 text-white backdrop-blur transition hover:text-accent group-hover:grid md:flex"
          >
            <Eye className="h-4.5 w-4.5" />
          </button>
        )}
      </div>

      <div className="flex minw-0 flex-1 flex-col gap-1.5 p-3 sm:p-4">
        <span className="text-[11px] font-semibold text-muted">{materials[product.material].label}</span>

        <h3 className="line-clamp-2 minw-0 leading-6">
          <Link to={`/product/${product.slug}`} className="font-bold transition-colors hover:text-accent">
            {product.title}
          </Link>
        </h3>

        <RatingStars />

        <div className="mt-auto flex items-center justify-between gap-2 pt-1.5">
          <div className="flex minw-0 flex-col">
            <span className="whitespace-nowrap text-base font-extrabold">{formatPrice(product.price)}</span>
            {product.oldPrice && (
              <span className="text-xs text-muted line-through">
                {toPersianDigits(product.oldPrice.toLocaleString("en-US").replace(/,/g, "٬"))} تومان
              </span>
            )}
          </div>
          {product.inStock && (
            <button
              type="button"
              onClick={() => addToCart(product, defaultOptions(product))}
              aria-label={`افزودن ${product.title} به سبد خرید`}
              className="touch grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-accent to-[#6d28d9] text-white shadow-lg shadow-accent/30 transition hover:brightness-110 active:scale-95"
            >
              <Cart className="h-5 w-5" />
            </button>
          )}
        </div>
      </div>
    </article>
  );
}
