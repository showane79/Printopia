import { useSearchParams, Link } from "react-router-dom";
import { getProducts } from "@/admin/lib/catalog";
import { useStore } from "@/context/StoreContext";
import { useSeo } from "@/components/Seo";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { ProductCard } from "@/components/ProductCard";
import { EmptyState } from "@/components/EmptyState";
import { Heart, Layers, MapPin, Truck, User } from "@/components/icons";
import { cn } from "@/utils/cn";
import { formatNumber } from "@/utils/format";

const tabs = [
  { id: "dashboard", label: "داشبورد", icon: Layers },
  { id: "orders", label: "سفارش‌ها", icon: Truck },
  { id: "wishlist", label: "علاقه‌مندی‌ها", icon: Heart },
  { id: "settings", label: "تنظیمات", icon: User },
];

export default function Account() {
  const [params, setParams] = useSearchParams();
  const tab = params.get("tab") ?? "dashboard";
  const { wishlist } = useStore();
  const wishProducts = getProducts().filter((p) => wishlist.includes(p.id));

  useSeo({ title: "حساب کاربری | پرینتوپیا", description: "مدیریت حساب کاربری، سفارش‌ها و علاقه‌مندی‌های شما در پرینتوپیا." });

  const stats = [
    { label: "سفارش‌های ثبت‌شده", value: 0, icon: Truck },
    { label: "علاقه‌مندی‌ها", value: wishlist.length, icon: Heart },
    { label: "آدرس‌های ذخیره‌شده", value: 0, icon: MapPin },
  ];

  return (
    <div className="container-x py-8">
      <Breadcrumbs items={[{ label: "خانه", to: "/" }, { label: "حساب کاربری" }]} />
      <h1 className="mt-5 text-2xl font-extrabold md:text-3xl">حساب کاربری</h1>

      <div className="mt-6 grid gap-6 lg:grid-cols-[230px_1fr]">
        {/* sidebar */}
        <aside className="minw-0 lg:sticky lg:top-24 lg:self-start">
          <div className="card p-2">
            <nav
              className="tab-scroll no-scrollbar lg:block lg:overflow-visible"
              role="tablist"
              aria-label="منوی حساب کاربری"
            >
              {tabs.map((t) => {
                const isActive = tab === t.id;
                return (
                  <button
                    key={t.id}
                    role="tab"
                    aria-selected={isActive}
                    type="button"
                    onClick={() => setParams({ tab: t.id })}
                    className={cn(
                      "flex shrink-0 items-center gap-2 whitespace-nowrap rounded-xl px-3 py-2.5 text-sm font-bold transition-colors lg:w-full",
                      isActive ? "bg-accent/10 text-accent" : "text-muted hover:bg-surface2 hover:text-fg"
                    )}
                  >
                    <t.icon className="h-5 w-5 shrink-0" />
                    <span className="whitespace-nowrap">{t.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>
        </aside>

        <div>
          {tab === "dashboard" && (
            <div className="space-y-6">
              <div className="card p-6">
                <p className="text-sm text-muted">خوش آمدید</p>
                <h2 className="mt-1 text-xl font-extrabold">سلام، کاربر پرینتوپیا 👋</h2>
                <p className="mt-2 text-sm leading-7 text-muted">
                  از اینجا می‌توانید سفارش‌ها، علاقه‌مندی‌ها و تنظیمات حساب خود را مدیریت کنید.
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Link to="/shop" className="btn btn-primary">شروع خرید</Link>
                  <Link to="/custom" className="btn btn-secondary">سفارش اختصاصی</Link>
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                {stats.map((s) => (
                  <div key={s.label} className="card p-5">
                    <span className="grid h-11 w-11 place-items-center rounded-xl bg-accent/12 text-accent">
                      <s.icon className="h-6 w-6" />
                    </span>
                    <p className="mt-3 text-3xl font-extrabold">{formatNumber(s.value)}</p>
                    <p className="text-sm text-muted">{s.label}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab === "orders" && (
            <EmptyState
              icon={<Truck className="h-7 w-7" />}
              title="هنوز سفارشی ثبت نکرده‌اید"
              description="سفارش‌های شما پس از خرید در اینجا نمایش داده می‌شوند."
              action={<Link to="/shop" className="btn btn-primary">شروع خرید</Link>}
            />
          )}

          {tab === "wishlist" &&
            (wishProducts.length === 0 ? (
              <EmptyState
                icon={<Heart className="h-7 w-7" />}
                title="لیست علاقه‌مندی‌های شما خالی است"
                description="محصولات مورد علاقه را با ❥ نشانه‌گذاری کنید تا اینجا ببینید."
                action={<Link to="/shop" className="btn btn-primary">کاوش فروشگاه</Link>}
              />
            ) : (
              <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
                {wishProducts.map((p) => (
                  <ProductCard key={p.id} product={p} />
                ))}
              </div>
            ))}

          {tab === "settings" && (
            <div className="card p-6">
              <h2 className="text-lg font-extrabold">اطلاعات حساب</h2>
              <p className="mt-1 text-sm text-muted">این یک حساب نمایشی است؛ اطلاعات ذخیره نمی‌شوند.</p>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-bold" htmlFor="acc-name">نام و نام خانوادگی</label>
                  <input id="acc-name" className="input" placeholder="نام شما" />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-bold" htmlFor="acc-email">ایمیل</label>
                  <input id="acc-email" dir="ltr" className="input text-start" placeholder="you@example.com" />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-bold" htmlFor="acc-phone">شماره موبایل</label>
                  <input id="acc-phone" dir="ltr" className="input text-start" placeholder="09123456789" />
                </div>
              </div>
              <button className="btn btn-primary mt-5">ذخیره تغییرات</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
