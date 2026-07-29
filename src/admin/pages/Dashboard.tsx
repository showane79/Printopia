import { Link } from "react-router-dom";
import { localRepository, listAdminProducts } from "../services/repository";
import { useAdminAuth } from "../auth";
import { PageHeader, StatusPill } from "../ui";
import { Eye, Gift, Layers, Plus } from "@/components/icons";
import { formatDate, toPersianDigits } from "@/utils/format";

export default function Dashboard() {
  const { status } = useAdminAuth();
  const posts = localRepository.listPosts();
  const products = listAdminProducts();
  const published = posts.filter((p) => p.status === "published").length;
  const drafts = posts.filter((p) => p.status === "draft").length;
  const activeProducts = products.filter((p) => p.status === "published").length;
  const recent = [...posts, ...products.map((p) => ({ id: p.id, title: p.title, status: p.status, updatedAt: p.updatedAt }))]
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, 6);

  const stats = [
    { label: "پست‌های منتشرشده", value: published },
    { label: "پیش‌نویس‌ها", value: drafts },
    { label: "محصولات فعال", value: activeProducts },
  ];

  const ready = status.serverAvailable && status.dbState === "ready" && status.setupComplete;

  const quick = [
    { label: "پست جدید", to: "/admin/posts/new", icon: Plus },
    { label: "محصول جدید", to: "/admin/products/new", icon: Gift },
    { label: "ویرایش صفحات", to: "/admin/pages", icon: Layers },
    { label: "مشاهده سایت", to: "/", icon: Eye },
  ];

  return (
    <div>
      <PageHeader
        title="پیشخوان"
        subtitle="نمای کلی محتوای سایت شما"
        action={
          <Link to="/admin/posts/new" className="btn btn-primary">
            <Plus className="h-5 w-5" /> پست جدید
          </Link>
        }
      />

      {/* admin backend status (honest) */}
      <div className="mb-6 flex flex-wrap items-center gap-3 rounded-xl border border-line bg-surface/50 p-4">
        <span
          className={`grid h-9 w-9 place-items-center rounded-lg ${ready ? "bg-success/15 text-success" : "bg-warning/15 text-warning"}`}
        >
          ●
        </span>
        <div className="minw-0 flex-1">
          <p className="text-sm font-bold">وضعیت ورود امن</p>
          <p className="text-xs leading-6 text-muted">
            {!status.serverAvailable
              ? "بخش سرور هنوز فعال نیست؛ کد جدید را روی Cloudflare منتشر کنید."
              : status.dbState === "binding_missing"
              ? "پایگاه‌داده به نسخهٔ فعال سایت متصل نیست. اتصال را در wrangler.jsonc ثبت کنید."
              : status.dbState === "unreachable"
              ? "پایگاه‌داده در دسترس نیست؛ کمی بعد دوباره بررسی کنید."
              : !status.setupComplete
              ? "راه‌اندازی اولیه کامل نشده است."
              : "ورود امن فعال است و حساب مدیر ساخته شده است."}
          </p>
        </div>
        <Link to="/admin/setup" className="btn btn-secondary shrink-0 text-sm">راه‌اندازی</Link>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {stats.map((s) => (
          <div key={s.label} className="card p-5">
            <p className="text-3xl font-extrabold text-gradient">{toPersianDigits(s.value)}</p>
            <p className="mt-1 text-sm text-muted">{s.label}</p>
          </div>
        ))}
      </div>

      {/* quick actions */}
      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {quick.map((q) => (
          <Link key={q.to} to={q.to} className="card flex flex-col items-center gap-2 p-4 text-center transition-colors hover:border-accent">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-accent/12 text-accent">
              <q.icon className="h-5 w-5" />
            </span>
            <span className="text-sm font-bold">{q.label}</span>
          </Link>
        ))}
      </div>

      <div className="card mt-6 p-5">
        <h2 className="mb-4 text-lg font-extrabold">آخرین تغییرات</h2>
        {recent.length === 0 ? (
          <div className="rounded-xl border border-dashed border-line p-8 text-center text-sm text-muted">
            هنوز محتوایی نساخته‌اید.
            <div className="mt-4">
              <Link to="/admin/posts/new" className="btn btn-primary"><Plus className="h-5 w-5" /> پست جدید</Link>
            </div>
          </div>
        ) : (
          <ul className="flex flex-col divide-y divide-line">
            {recent.map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-3 py-3">
                <div className="minw-0">
                  <span className="block truncate font-bold">{p.title || "بدون عنوان"}</span>
                  <span className="text-xs text-muted">{formatDate(p.updatedAt)}</span>
                </div>
                <StatusPill status={p.status} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
