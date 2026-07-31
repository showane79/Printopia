import { Link } from "react-router-dom";
import { useStore } from "@/context/StoreContext";
import { Drawer } from "@/components/Drawer";
import { EmptyState } from "@/components/EmptyState";
import { Cart as CartIcon, Minus, Plus, Trash } from "@/components/icons";
import { formatPrice, toPersianDigits } from "@/utils/format";
import { imgFallback } from "@/utils/img";
import { site } from "@/data/site";

export function MiniCart() {
  const { cart, cartOpen, setCartOpen, updateQty, removeFromCart, cartSubtotal } = useStore();
  const freeShip = site.freeShippingThreshold;
  const remaining = Math.max(0, freeShip - cartSubtotal);
  const progress = Math.min(100, cartSubtotal > 0 ? (cartSubtotal / freeShip) * 100 : 0);

  return (
    <Drawer open={cartOpen} onClose={() => setCartOpen(false)} side="start" title="سبد خرید" label="سبد خرید شما">
      {cart.length === 0 ? (
        <EmptyState
          icon={<CartIcon className="h-7 w-7" />}
          title="سبد خرید شما خالی است"
          description="هنوز محصولی به سبد خرید اضافه نکرده‌اید."
          action={
            <Link className="btn btn-primary" to="/shop" onClick={() => setCartOpen(false)}>
              شروع خرید
            </Link>
          }
        />
      ) : (
        <>
          <div className="card mb-4 p-4">
            <p className="mb-2 text-sm leading-7 text-muted">
              {remaining > 0 ? (
                <>
                  با <b className="text-fg">{formatPrice(remaining)}</b> خرید بیشتر، ارسال سفارش شما رایگان می‌شود!
                </>
              ) : (
                <span className="text-success">ارسال این سفارش رایگان است 🎉</span>
              )}
            </p>
            <div className="h-2 overflow-hidden rounded-full bg-surface2">
              <div
                className="h-full rounded-full bg-gradient-to-l from-accent to-accent2 transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          <ul className="flex flex-col gap-3">
            {cart.map((item) => (
              <li key={item.key} className="flex gap-3">
                <Link to={`/product/${item.slug}`} onClick={() => setCartOpen(false)} className="shrink-0">
                  <img {...imgFallback} src={item.image} alt={item.title} className="h-20 w-20 rounded-xl bg-surface2 object-cover" />
                </Link>
                <div className="flex min-w-0 flex-1 flex-col">
                  <div className="flex items-start justify-between gap-2">
                    <Link
                      to={`/product/${item.slug}`}
                      onClick={() => setCartOpen(false)}
                      className="line-clamp-2 text-sm font-bold leading-6 hover:text-accent"
                    >
                      {item.title}
                    </Link>
                    <button
                      type="button"
                      onClick={() => removeFromCart(item.key)}
                      aria-label={`حذف ${item.title}`}
                      className="shrink-0 text-muted transition-colors hover:text-danger"
                    >
                      <Trash className="h-4 w-4" />
                    </button>
                  </div>
                  <p className="mt-0.5 text-xs text-muted">
                    {item.color} · {item.material}
                  </p>
                  <div className="mt-auto flex items-center justify-between pt-2">
                    <div className="flex items-center gap-0.5 rounded-lg border border-line p-0.5">
                      <button
                        type="button"
                        onClick={() => updateQty(item.key, item.qty - 1)}
                        className="grid h-7 w-7 place-items-center rounded-md hover:bg-surface"
                        aria-label="کاهش تعداد"
                      >
                        <Minus className="h-3.5 w-3.5" />
                      </button>
                      <span className="w-6 text-center text-sm font-bold" aria-live="polite">
                        {toPersianDigits(item.qty)}
                      </span>
                      <button
                        type="button"
                        onClick={() => updateQty(item.key, item.qty + 1)}
                        className="grid h-7 w-7 place-items-center rounded-md hover:bg-surface"
                        aria-label="افزایش تعداد"
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <span className="text-sm font-extrabold">{formatPrice(item.unitPrice * item.qty)}</span>
                  </div>
                </div>
              </li>
            ))}
          </ul>

          <div className="sticky bottom-0 -mx-5 -mb-5 mt-5 border-t border-line bg-surface/90 p-5 backdrop-blur">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm text-muted">مجموع سبد</span>
              <span className="text-lg font-extrabold">{formatPrice(cartSubtotal)}</span>
            </div>
            <div className="flex flex-col gap-2">
              <Link to="/cart" onClick={() => setCartOpen(false)} className="btn btn-secondary">
                مشاهدهٔ سبد خرید
              </Link>
              <Link to="/checkout" onClick={() => setCartOpen(false)} className="btn btn-primary">
                تسویه و پرداخت
              </Link>
            </div>
          </div>
        </>
      )}
    </Drawer>
  );
}
