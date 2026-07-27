import { Link } from "react-router-dom";
import { localRepository } from "../services/repository";
import { useAdminAuth } from "../auth";
import { PageHeader, StatusPill } from "../ui";
import { Plus } from "@/components/icons";
import { formatDate, toPersianDigits } from "@/utils/format";

export default function Dashboard() {
  const { authMode } = useAdminAuth();
  const posts = localRepository.listPosts();
  const published = posts.filter((p) => p.status === "published").length;
  const drafts = posts.filter((p) => p.status === "draft").length;
  const recent = [...posts].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 5);

  const stats = [
    { label: "مقاله‌های منتشرشده", value: published },
    { label: "پیش‌نویس‌ها", value: drafts },
    { label: "کل مقاله‌ها", value: posts.length },
  ];

  return (
    <div>
      <PageHeader
        title="پیشخوان"
        subtitle="نمای کلی محتوای سایت شما"
        action={
          <Link to="/admin/posts/new" className="btn btn-primary">
            <Plus className="h-5 w-5" /> مقاله جدید
          </Link>
        }
      />

      {authMode === "demo" && (
        <div className="mb-6 rounded-xl border border-warning/30 bg-warning/10 p-4 text-sm leading-7 text-warning">
          شما در حالت پیش‌نمایش مرورگر هستید. محتوا فقط در همین مرورگر ذخیره می‌شود. برای انتشار واقعی و
          خودکار در سایت، پنل را روی Cloudflare Pages مستقر کنید (راهنما در صفحهٔ «راه‌اندازی»).
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {stats.map((s) => (
          <div key={s.label} className="card p-5">
            <p className="text-3xl font-extrabold text-gradient">{toPersianDigits(s.value)}</p>
            <p className="mt-1 text-sm text-muted">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="card mt-6 p-5">
        <h2 className="mb-4 text-lg font-extrabold">آخرین ویرایش‌ها</h2>
        {recent.length === 0 ? (
          <div className="rounded-xl border border-dashed border-line p-8 text-center text-sm text-muted">
            هنوز مقاله‌ای نساخته‌اید. اولین مقاله را شروع کنید.
            <div className="mt-4">
              <Link to="/admin/posts/new" className="btn btn-primary">
                <Plus className="h-5 w-5" /> مقاله جدید
              </Link>
            </div>
          </div>
        ) : (
          <ul className="flex flex-col divide-y divide-line">
            {recent.map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-3 py-3">
                <div className="minw-0">
                  <Link to={`/admin/posts/${p.id}`} className="font-bold hover:text-accent">
                    {p.title || "بدون عنوان"}
                  </Link>
                  <p className="text-xs text-muted">{formatDate(p.updatedAt)}</p>
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
