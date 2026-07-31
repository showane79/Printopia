import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { useStore } from "@/context/StoreContext";
import { site } from "@/data/site";
import { useSeo } from "@/components/Seo";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { EmptyState } from "@/components/EmptyState";
import { ArrowLeft, Cart as CartIcon, Check, Minus, Plus, Trash, Truck } from "@/components/icons";
import { formatPrice, toPersianDigits } from "@/utils/format";
import { imgFallback } from "@/utils/img";

const SHIPPING_COST = 60_000;
const DEMO_CODE = "PRINTO10";

export default function Cart() {
  const { cart, updateQty, removeFromCart, cartSubtotal, clearCart } = useStore();
  const [code, setCode] = useState("");
  const [applied, setApplied] = useState(false);
  const [codeError, setCodeError] = useState("");

  const freeShip = site.freeShippingThreshold;
  const shipping = cartSubtotal === 0 || cartSubtotal >= freeShip ? 0 : SHIPPING_COST;
  const discount = applied ? Math.round(cartSubtotal * 0.1) : 0;
  const total = Math.max(0, cartSubtotal - discount) + shipping;

  function applyCode(e: FormEvent) {
    e.preventDefault();
    if (code.trim().toUpperCase() === DEMO_CODE) {
      setApplied(true);
      setCodeError("");
      setCode("");
    } else {
      setCodeError("کد تخفیف نامعتبر است. (کد نمونه: PRINTO10)");
      setApplied(false);
    }
  }

  useSeo({ title: "سبد خرید | پرینتوپیا", description: "مرور سبد خرید و تسویهٔ حساب در فروشگاه پرینتوپیا." });

  if (cart.length === 0) {
    return (
      <div className="container-x py-8">
        <Breadcrumbs items={[{ label: "خانه", to: "/" }, { label: "سبد خرید" }]} />
        <div className="mt-8">
          <EmptyState
            icon={<CartIcon className="h-7 w-7" />}
            title="سبد خرید شما خالی است"
            description="به نظر می‌رسد هنوز محصولی انتخاب نکرده‌اید. فروشگاه پرینتوپیا را کاوش کنید."
            action={
              <Link to="/shop" className="btn btn-primary">
                شروع خرید
              </Link>
            }
          />
        </div>
      </div>
    );
  }

  return (
    <div className="container-x py-8">
      <Breadcrumbs items={[{ label: "خانه", to: "/" }, { label: "سبد خرید" }]} />
      <div className="mt-5 flex items-center justify-between">
        <h1 className="text-2xl font-extrabold md:text-3xl">سبد خرید</h1>
        <button onClick={clearCart} className="text-sm text-muted transition-colors hover:text-danger">
          خالی کردن سبد
        </button>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_360px]">
        {/* items */}
        <ul className="flex flex-col gap-4">
          {cart.map((item) => (
            <li key={item.key} className="card flex gap-4 p-4">
              <Link to={`/product/${item.slug}`} className="shrink-0">
                <img {...imgFallback} src={item.image} alt={item.title} className="h-28 w-28 rounded-xl bg-surface2 object-cover" />
              </Link>
              <div className="flex min-w-0 flex-1 flex-col">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <Link to={`/product/${item.slug}`} className="font-bold hover:text-accent">
                      {item.title}
                    </Link>
                    <p className="mt-1 text-sm text-muted">
                      {item.color} · {item.material}
                      {item.size ? ` · ${item.size}` : ""}
                    </p>
                    {item.engraving && (
                      <p className="mt-1 text-sm text-accent2">حک: {item.engraving}</p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => removeFromCart(item.key)}
                    aria-label={`حذف ${item.title}`}
                    className="text-muted transition-colors hover:text-danger"
                  >
                    <Trash className="h-5 w-5" />
                  </button>
                </div>
                <div className="mt-auto flex items-end justify-between pt-3">
                  <div className="flex items-center gap-1 rounded-xl border border-line p-1">
                    <button type="button" onClick={() => updateQty(item.key, item.qty - 1)} className="grid h-8 w-8 place-items-center rounded-lg hover:bg-surface" aria-label="کاهش تعداد">
                      <Minus className="h-4 w-4" />
                    </button>
                    <span className="w-8 text-center font-bold">{toPersianDigits(item.qty)}</span>
                    <button type="button" onClick={() => updateQty(item.key, item.qty + 1)} className="grid h-8 w-8 place-items-center rounded-lg hover:bg-surface" aria-label="افزایش تعداد">
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="text-end">
                    <div className="font-extrabold">{formatPrice(item.unitPrice * item.qty)}</div>
                    <div className="text-xs text-muted">{formatPrice(item.unitPrice)} هر عدد</div>
                  </div>
                </div>
              </div>
            </li>
          ))}
          <Link to="/shop" className="inline-flex items-center gap-1 text-sm font-bold text-accent hover:gap-2">
            <ArrowLeft className="h-4 w-4" /> ادامه خرید
          </Link>
        </ul>

        {/* summary */}
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="card p-5">
            <h2 className="font-extrabold">خلاصه سفارش</h2>
            <dl className="mt-4 space-y-3 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted">جمع کالاها</dt>
                <dd className="font-semibold">{formatPrice(cartSubtotal)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted">هزینه ارسال</dt>
                <dd className="font-semibold">{shipping === 0 ? "رایگان" : formatPrice(shipping)}</dd>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-success">
                  <dt>تخفیف (۱۰٪)</dt>
                  <dd className="font-semibold">− {formatPrice(discount)}</dd>
                </div>
              )}
            </dl>

            <form onSubmit={applyCode} className="mt-4">
              <label htmlFor="coupon" className="mb-2 block text-sm font-bold">
                کد تخفیف
              </label>
              <div className="flex gap-2">
                <input
                  id="coupon"
                  className="input"
                  dir="ltr"
                  placeholder="PRINTO10"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                />
                <button type="submit" className="btn btn-secondary shrink-0">
                  اعمال
                </button>
              </div>
              {applied && (
                <p className="mt-2 flex items-center gap-1 text-sm text-success">
                  <Check className="h-4 w-4" /> کد تخفیف اعمال شد.
                </p>
              )}
              {codeError && (
                <p role="alert" className="mt-2 text-sm text-danger">
                  {codeError}
                </p>
              )}
            </form>

            <div className="mt-4 flex items-center justify-between border-t border-line pt-4">
              <span className="font-bold">مبلغ قابل پرداخت</span>
              <span className="text-xl font-extrabold">{formatPrice(total)}</span>
            </div>

            <Link to="/checkout" className="btn btn-primary mt-5 w-full">
              ادامه به پرداخت
            </Link>
            <p className="mt-3 flex items-center justify-center gap-1.5 text-xs text-muted">
              <Truck className="h-4 w-4" /> ارسال رایگان برای سفارش‌های بالای {formatPrice(freeShip)}
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
