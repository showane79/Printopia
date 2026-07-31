import { useState, type ReactNode } from "react";
import { Link, NavLink, Navigate, Outlet, Route, Routes, useNavigate } from "react-router-dom";
import { useAdminAuth } from "./auth";
import { Drawer } from "@/components/Drawer";
import {
  Close,
  Cube,
  Eye,
  Gift,
  Grid,
  Layers,
  Menu as MenuIcon,
  Palette,
  Send,
  Shield,
  Sparkles,
  Sun,
  Upload,
} from "@/components/icons";
import { cn } from "@/utils/cn";
import { Login } from "./pages/access";
import { Setup } from "./pages/SetupWizard";
import Dashboard from "./pages/Dashboard";
import Posts from "./pages/Posts";
import PostEditor from "./pages/PostEditor";
import Products from "./pages/Products";
import ProductEditor from "./pages/ProductEditor";
import { Categories, Media, PagesManager } from "./pages/misc";
import {
  Appearance,
  Navigation,
  ProductCategories,
  Redirects,
  Seo,
  SiteSettings,
} from "./pages/manage";

const NAV = [
  { to: "/admin/dashboard", label: "پیشخوان", icon: Grid },
  { to: "/admin/posts", label: "پست‌ها و مقالات", icon: Layers },
  { to: "/admin/categories", label: "دسته‌بندی‌ها", icon: Cube },
  { to: "/admin/products", label: "محصولات", icon: Gift },
  { to: "/admin/product-categories", label: "دسته‌بندی محصولات", icon: Palette },
  { to: "/admin/pages", label: "صفحات سایت", icon: Sparkles },
  { to: "/admin/media", label: "رسانه‌ها", icon: Upload },
  { to: "/admin/navigation", label: "منوها و ناوبری", icon: MenuIcon },
  { to: "/admin/appearance", label: "ظاهر سایت", icon: Sun },
  { to: "/admin/seo", label: "سئو", icon: Eye },
  { to: "/admin/redirects", label: "ریدایرکت‌ها", icon: Send },
  { to: "/admin/site-settings", label: "تنظیمات سایت", icon: Shield },
];

function Brand() {
  return (
    <Link to="/admin/dashboard" className="flex items-center gap-2 border-b border-line px-4 py-4">
      <span className="grid h-9 w-9 place-items-center rounded-lg bg-gradient-to-br from-accent to-[#6d28d9] text-white">
        <Cube className="h-5 w-5" />
      </span>
      <span className="flex flex-col leading-none">
        <span className="whitespace-nowrap font-extrabold">پرینتوپیا</span>
        <span className="whitespace-nowrap text-[10px] text-muted">پنل مدیریت</span>
      </span>
    </Link>
  );
}

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <nav className="flex flex-col gap-1" aria-label="منوی مدیریت">
      {NAV.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          onClick={onNavigate}
          className={({ isActive }) =>
            cn(
              "flex items-center gap-3 whitespace-nowrap rounded-xl px-3 py-2.5 text-sm font-bold transition-colors",
              isActive ? "bg-accent/10 text-accent" : "text-muted hover:bg-surface2 hover:text-fg"
            )
          }
        >
          <item.icon className="h-5 w-5 shrink-0" />
          {item.label}
        </NavLink>
      ))}
    </nav>
  );
}

function RequireAuth({ children }: { children: ReactNode }) {
  const { isAuthed, status } = useAdminAuth();
  if (status.loading) {
    return (
      <div className="grid min-h-screen place-items-center text-muted">
        <span className="h-7 w-7 animate-spin rounded-full border-2 border-accent border-t-transparent" />
      </div>
    );
  }
  return isAuthed ? <>{children}</> : <Navigate to="/admin/login" replace />;
}

function AdminLayout() {
  const { logout } = useAdminAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  function doLogout() {
    logout();
    navigate("/admin/login");
  }

  return (
    <div className="min-h-screen lg:flex">
      <aside className="hidden border-l border-line bg-surface/40 lg:flex lg:h-screen lg:w-64 lg:shrink-0 lg:flex-col lg:sticky lg:top-0">
        <Brand />
        <div className="minw-0 flex-1 overflow-auto p-3">
          <NavLinks />
        </div>
        <div className="border-t border-line p-3">
          <button onClick={doLogout} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold text-muted transition-colors hover:bg-surface2 hover:text-fg">
            <Close className="h-5 w-5" /> خروج از حساب
          </button>
        </div>
      </aside>

      <div className="flex minw-0 flex-1 flex-col">
        <header className="glass sticky top-0 z-40 border-b border-line lg:hidden" style={{ paddingTop: "var(--safe-top)" }}>
          <div className="container-x flex h-14 items-center gap-2">
            <button onClick={() => setOpen(true)} aria-label="منو" className="grid h-11 w-11 place-items-center rounded-xl border border-line bg-surface2">
              <MenuIcon className="h-5 w-5" />
            </button>
            <span className="whitespace-nowrap font-extrabold">پنل مدیریت پرینتوپیا</span>
          </div>
        </header>
        <main className="container-x minw-0 flex-1 p-4 pb-24 md:p-6 lg:pb-6">
          <Outlet />
        </main>
      </div>

      <Drawer open={open} onClose={() => setOpen(false)} side="start" title="منوی مدیریت">
        <NavLinks onNavigate={() => setOpen(false)} />
        <button onClick={() => { setOpen(false); doLogout(); }} className="btn btn-secondary mt-4 w-full">
          خروج از حساب
        </button>
      </Drawer>
    </div>
  );
}

export default function AdminApp() {
  return (
    <Routes>
      <Route path="/admin/login" element={<Login />} />
      <Route path="/admin/setup" element={<Setup />} />
      <Route
        path="/admin"
        element={
          <RequireAuth>
            <AdminLayout />
          </RequireAuth>
        }
      >
        <Route index element={<Navigate to="/admin/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="posts" element={<Posts />} />
        <Route path="posts/new" element={<PostEditor />} />
        <Route path="posts/:id" element={<PostEditor />} />
        <Route path="categories" element={<Categories />} />
        <Route path="products" element={<Products />} />
        <Route path="products/new" element={<ProductEditor />} />
        <Route path="products/:id" element={<ProductEditor />} />
        <Route path="product-categories" element={<ProductCategories />} />
        <Route path="pages" element={<PagesManager />} />
        <Route path="media" element={<Media />} />
        <Route path="navigation" element={<Navigation />} />
        <Route path="appearance" element={<Appearance />} />
        <Route path="seo" element={<Seo />} />
        <Route path="redirects" element={<Redirects />} />
        <Route path="site-settings" element={<SiteSettings />} />
        <Route path="settings" element={<SiteSettings />} />
      </Route>
    </Routes>
  );
}
