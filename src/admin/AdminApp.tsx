import { useState, type ReactNode } from "react";
import { Link, NavLink, Navigate, Outlet, Route, Routes, useNavigate } from "react-router-dom";
import { useAdminAuth } from "./auth";
import { Drawer } from "@/components/Drawer";
import { Close, Cube, Grid, Layers, Menu, Palette, Shield, Sparkles } from "@/components/icons";
import { cn } from "@/utils/cn";
import { Login, Setup } from "./pages/access";
import Dashboard from "./pages/Dashboard";
import Posts from "./pages/Posts";
import PostEditor from "./pages/PostEditor";
import { Categories, Media, PagesManager, Settings } from "./pages/misc";

const NAV = [
  { to: "/admin/dashboard", label: "پیشخوان", icon: Grid },
  { to: "/admin/posts", label: "مقالات", icon: Layers },
  { to: "/admin/categories", label: "دسته‌بندی‌ها", icon: Cube },
  { to: "/admin/pages", label: "صفحات سایت", icon: Sparkles },
  { to: "/admin/media", label: "رسانه‌ها", icon: Palette },
  { to: "/admin/settings", label: "تنظیمات", icon: Shield },
];

function Brand() {
  return (
    <Link to="/admin/dashboard" className="flex items-center gap-2 border-b border-line px-4 py-4">
      <span className="grid h-9 w-9 place-items-center rounded-lg bg-gradient-to-br from-accent to-[#6d28d9] text-white">
        <Cube className="h-5 w-5" />
      </span>
      <span className="flex flex-col leading-none">
        <span className="font-extrabold">پرینتوپیا</span>
        <span className="text-[10px] text-muted">پنل مدیریت</span>
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
              "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold transition-colors",
              isActive ? "bg-accent/10 text-accent" : "text-muted hover:bg-surface2 hover:text-fg"
            )
          }
        >
          <item.icon className="h-5 w-5" />
          {item.label}
        </NavLink>
      ))}
    </nav>
  );
}

function RequireAuth({ children }: { children: ReactNode }) {
  const { isAuthed } = useAdminAuth();
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
        <div className="flex-1 overflow-auto p-3">
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
              <Menu className="h-5 w-5" />
            </button>
            <span className="font-extrabold">پنل مدیریت پرینتوپیا</span>
          </div>
        </header>
        <main className="container-x minw-0 flex-1 p-4 md:p-6 pb-24 lg:pb-6">
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
        <Route path="pages" element={<PagesManager />} />
        <Route path="media" element={<Media />} />
        <Route path="settings" element={<Settings />} />
      </Route>
    </Routes>
  );
}
