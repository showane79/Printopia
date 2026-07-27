import { useEffect, useState, type FormEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { mainNav, site } from "@/data/site";
import { categories } from "@/data/catalog";
import { useStore } from "@/context/StoreContext";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Drawer } from "@/components/Drawer";
import { MiniCart } from "@/components/MiniCart";
import { Cart, ChevronDown, Heart, Layers, Menu, Search, User } from "@/components/icons";
import { cn } from "@/utils/cn";

function SearchForm({ onSubmitted }: { onSubmitted?: () => void }) {
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  function submit(e: FormEvent) {
    e.preventDefault();
    const term = q.trim();
    if (!term) return;
    navigate(`/search?q=${encodeURIComponent(term)}`);
    onSubmitted?.();
  }
  return (
    <form onSubmit={submit} role="search" className="relative">
      <span
        className="pointer-events-none absolute inset-y-0 grid w-10 place-items-center text-muted"
        style={{ insetInlineStart: 0 }}
      >
        <Search className="h-5 w-5" />
      </span>
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        type="search"
        placeholder="جستجوی محصول..."
        aria-label="جستجو در فروشگاه"
        className="input pe-3"
        style={{ paddingInlineStart: "2.6rem" }}
      />
    </form>
  );
}

function CountBadge({ n }: { n: number }) {
  if (n <= 0) return null;
  return (
    <span className="absolute -end-1.5 -top-1.5 grid h-5 min-w-[20px] place-items-center rounded-full bg-accent px-1 text-[10px] font-bold text-white">
      {n.toLocaleString("fa-IR")}
    </span>
  );
}

const mobileBtn = "touch relative grid h-11 w-11 place-items-center rounded-xl border border-line bg-surface2 text-fg transition-colors hover:border-accent";
const desktopBtn = "relative grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-line bg-surface2 text-fg transition-colors hover:border-accent";

function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <Link
      to="/"
      className="flex shrink-0 items-center gap-2"
      aria-label={site.brand}
    >
      <span
        className={cn(
          "grid place-items-center rounded-xl bg-gradient-to-br from-accent to-[#6d28d9] text-white shadow-lg shadow-accent/30",
          compact ? "h-8 w-8" : "h-10 w-10"
        )}
      >
        <Layers className={compact ? "h-5 w-5" : "h-6 w-6"} />
      </span>
      <span className="flex flex-col leading-none">
        <span className="whitespace-nowrap text-base font-extrabold lg:text-lg">{site.brand}</span>
        {!compact && (
          <span className="whitespace-nowrap text-[10px] tracking-widest text-muted">PRINTOPIA</span>
        )}
      </span>
    </Link>
  );
}

function DesktopActions({ wishlistCount, cartCount, setCartOpen, openSearch }: {
  wishlistCount: number;
  cartCount: number;
  setCartOpen: (v: boolean) => void;
  openSearch: () => void;
}) {
  return (
    <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
      <div className="hidden w-52 2xl:block">
        <SearchForm />
      </div>
      <button
        type="button"
        className={cn(desktopBtn, "2xl:hidden")}
        onClick={openSearch}
        aria-label="جستجو"
      >
        <Search className="h-5 w-5" />
      </button>
      <ThemeToggle />
      <Link to="/account" className={desktopBtn} aria-label="حساب کاربری">
        <User className="h-5 w-5" />
      </Link>
      <Link to="/account?tab=wishlist" className={desktopBtn} aria-label="علاقه‌مندی‌ها">
        <Heart className="h-5 w-5" />
        <CountBadge n={wishlistCount} />
      </Link>
      <button
        type="button"
        className={desktopBtn}
        onClick={() => setCartOpen(true)}
        aria-label={`سبد خرید، ${cartCount} کالا`}
      >
        <Cart className="h-5 w-5" />
        <CountBadge n={cartCount} />
      </button>
    </div>
  );
}

export function Header() {
  const { cartCount, wishlistCount, setCartOpen } = useStore();
  const location = useLocation();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [catOpen, setCatOpen] = useState(false);

  // Header style on scroll (lightweight; no promo logic).
  useEffect(() => {
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        setScrolled(window.scrollY > 8);
        ticking = false;
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Close drawers on navigation.
  useEffect(() => {
    setMobileOpen(false);
    setSearchOpen(false);
  }, [location.pathname, location.search]);

  const active = (to: string) => {
    if (to === "/") return location.pathname === "/";
    const qIndex = to.indexOf("?");
    const base = qIndex >= 0 ? to.slice(0, qIndex) : to;
    const qs = qIndex >= 0 ? to.slice(qIndex) : "";
    if (qs) return location.pathname === base && location.search === qs;
    return location.pathname === base || location.pathname.startsWith(base + "/");
  };

  return (
    <>
      <a className="skip-link" href="#main">
        رفتن به محتوای اصلی
      </a>

      <header
        className={cn(
          "sticky top-0 z-50 transition-colors",
          scrolled ? "glass border-b border-line" : "bg-canvas/60 backdrop-blur-sm"
        )}
        style={{ paddingTop: "var(--safe-top)" }}
      >
        {/* ===================== MOBILE BAR ===================== */}
        <div className="container-x xl:hidden">
          <div className="grid h-14 grid-cols-[auto_1fr_auto] items-center gap-2">
            <button
              type="button"
              className={mobileBtn}
              onClick={() => setMobileOpen(true)}
              aria-label="باز کردن منو"
              aria-expanded={mobileOpen}
            >
              <Menu className="h-5 w-5" />
            </button>

            <div className="flex minw-0 justify-center">
              <Brand compact />
            </div>

            <div className="flex items-center justify-end gap-1.5">
              <button
                type="button"
                className={mobileBtn}
                onClick={() => setSearchOpen(true)}
                aria-label="جستجو"
              >
                <Search className="h-5 w-5" />
              </button>
              <button
                type="button"
                className={mobileBtn}
                onClick={() => setCartOpen(true)}
                aria-label={`سبد خرید، ${cartCount} کالا`}
              >
                <Cart className="h-5 w-5" />
                <CountBadge n={cartCount} />
              </button>
            </div>
          </div>
        </div>

        {/* ===================== DESKTOP BAR ===================== */}
        <div className="container-x hidden lg:block">
          <div className="flex h-[68px] items-center gap-4">
            {/* Right (RTL): brand — never shrinks */}
            <Brand />

            {/* Center: navigation — one line, never wraps */}
            <nav
              className="flex min-w-0 flex-1 items-center justify-center gap-4 xl:gap-5"
              aria-label="منوی اصلی"
            >
              {mainNav.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  aria-current={active(item.to) ? "page" : undefined}
                  className="nav-link whitespace-nowrap text-[13px] xl:text-sm"
                >
                  {item.label}
                </Link>
              ))}
            </nav>

            {/* Left (RTL): actions — never shrink */}
            <DesktopActions
              wishlistCount={wishlistCount}
              cartCount={cartCount}
              setCartOpen={setCartOpen}
              openSearch={() => setSearchOpen(true)}
            />
          </div>
        </div>
      </header>

      {/* ===================== MOBILE NAV DRAWER ===================== */}
      <Drawer open={mobileOpen} onClose={() => setMobileOpen(false)} side="start" title={site.brand} label="منوی اصلی">
        <nav className="flex flex-col gap-1" aria-label="منوی موبایل">
          <button
            type="button"
            onClick={() => setSearchOpen(true)}
            className="flex minw-0 items-center gap-3 rounded-xl border border-line bg-surface2 px-3 py-3 text-start font-bold"
          >
            <Search className="h-5 w-5 text-accent" /> جستجو
          </button>

          {mainNav.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              aria-current={active(item.to) ? "page" : undefined}
              className={cn(
                "touch flex items-center rounded-xl px-3 py-3 font-bold transition-colors",
                active(item.to) ? "bg-accent/10 text-accent" : "hover:bg-surface2"
              )}
            >
              {item.label}
            </Link>
          ))}

          {/* expandable categories */}
          <button
            type="button"
            onClick={() => setCatOpen((v) => !v)}
            aria-expanded={catOpen}
            className="touch flex items-center justify-between rounded-xl px-3 py-3 font-bold transition-colors hover:bg-surface2"
          >
            همه دسته‌بندی‌ها
            <ChevronDown className={cn("h-5 w-5 text-accent transition-transform", catOpen && "rotate-180")} />
          </button>
          {catOpen && (
            <div className="flex flex-col gap-0.5 pe-3">
              {categories.map((c) => (
                <Link
                  key={c.id}
                  to={`/shop?cat=${c.id}`}
                  className="touch flex items-center rounded-lg px-3 py-2.5 text-sm text-muted transition-colors hover:bg-surface2 hover:text-fg"
                >
                  {c.name}
                </Link>
              ))}
            </div>
          )}

          <div className="my-2 border-t border-line" />
          <Link to="/account" className="touch flex items-center gap-3 rounded-xl px-3 py-3 font-bold hover:bg-surface2">
            <User className="h-5 w-5 text-accent" /> ورود / حساب کاربری
          </Link>
          <Link to="/account?tab=wishlist" className="touch flex items-center gap-3 rounded-xl px-3 py-3 font-bold hover:bg-surface2">
            <Heart className="h-5 w-5 text-accent" /> علاقه‌مندی‌ها
          </Link>
          <div className="flex items-center justify-between rounded-xl px-3 py-3">
            <span className="flex items-center gap-3 font-bold">
              <span className="text-accent">☀︎</span> تغییر حالت روشن / تیره
            </span>
            <ThemeToggle />
          </div>
        </nav>

        <Link to="/custom" className="btn btn-primary mt-4 w-full">
          ساخت محصول سفارشی
        </Link>
      </Drawer>

      {/* ===================== SEARCH DRAWER ===================== */}
      <Drawer open={searchOpen} onClose={() => setSearchOpen(false)} side="end" title="جستجو" label="جستجو در فروشگاه">
        <SearchForm onSubmitted={() => setSearchOpen(false)} />
        <div className="mt-5">
          <p className="mb-2 text-sm text-muted">جستجوهای پرطرفدار</p>
          <div className="flex flex-wrap gap-2">
            {["اکشن فیگور", "اژدها", "گلدان", "برج تاس", "هدیه شخصی"].map((s) => (
              <Link key={s} to={`/search?q=${encodeURIComponent(s)}`} className="chip hover:border-accent">
                {s}
              </Link>
            ))}
          </div>
        </div>
      </Drawer>

      <MiniCart />
    </>
  );
}
