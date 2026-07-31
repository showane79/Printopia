import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useStore } from "@/context/StoreContext";
import { PageHeader, StatusPill, ConfirmDialog } from "../ui";
import { Plus, Search, Trash } from "@/components/icons";
import { formatDate, toPersianDigits } from "@/utils/format";
import { cn } from "@/utils/cn";

interface PostListItem {
  id: string; slug: string; title: string; status: string;
  category: string; updatedAt: string; publishDate?: string;
  excerpt: string; body: unknown[]; tags: string[]; cover?: string;
  coverAlt?: string; seoTitle?: string; metaDescription?: string;
}

export default function Posts() {
  const { pushToast } = useStore();
  const [posts, setPosts] = useState<PostListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const [toDelete, setToDelete] = useState<PostListItem | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/posts", { headers: { Accept: "application/json" } });
      const data = await res.json();
      setPosts(data.posts || []);
    } catch { setPosts([]); }
    setLoading(false);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const filtered = posts
    .filter((p) => (status === "all" ? true : p.status === status))
    .filter((p) => { const n = q.trim(); return !n || p.title.includes(n) || p.slug.includes(n); })
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

  async function togglePublish(p: PostListItem) {
    const newStatus = p.status === "published" ? "draft" : "published";
    const res = await fetch(`/api/admin/posts/${p.id}`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...p, status: newStatus }),
    });
    if (res.ok) { pushToast(newStatus === "published" ? "منتشر شد و در سایت نمایش داده می‌شود" : "از انتشار خارج شد"); refresh(); }
    else pushToast("خطا در تغییر وضعیت", "error");
  }

  async function doDelete() {
    if (!toDelete) return;
    const res = await fetch(`/api/admin/posts/${toDelete.id}`, { method: "DELETE", headers: { "Content-Type": "application/json" } });
    if (res.ok) { pushToast("پست حذف شد و از سایت برداشته شد", "info"); setToDelete(null); refresh(); }
    else pushToast("حذف ناموفق بود", "error");
  }

  return (
    <div>
      <PageHeader
        title="پست‌ها و مقالات"
        subtitle={loading ? "در حال بارگذاری..." : `${toPersianDigits(filtered.length)} نتیجه`}
        action={<Link to="/admin/posts/new" className="btn btn-primary"><Plus className="h-5 w-5" /> مقاله جدید</Link>}
      />

      <div className="card mb-5 grid gap-3 p-4 sm:grid-cols-2">
        <div className="relative">
          <span className="pointer-events-none absolute inset-y-0 grid w-10 place-items-center text-muted" style={{ insetInlineStart: 0 }}><Search className="h-5 w-5" /></span>
          <input className="input pe-3" style={{ paddingInlineStart: "2.6rem" }} placeholder="جستجوی عنوان یا اسلاگ..." value={q} onChange={(e) => setQ(e.target.value)} aria-label="جستجو" />
        </div>
        <select className="input" value={status} onChange={(e) => setStatus(e.target.value)} aria-label="وضعیت">
          <option value="all">همهٔ وضعیت‌ها</option>
          <option value="published">منتشرشده</option>
          <option value="draft">پیش‌نویس</option>
          <option value="archived">بایگانی‌شده</option>
        </select>
      </div>

      {loading ? (
        <div className="card p-8 text-center text-sm text-muted">در حال بارگذاری پست‌ها…</div>
      ) : filtered.length === 0 ? (
        <div className="card p-10 text-center text-muted">پستی پیدا نشد. <Link to="/admin/posts/new" className="text-accent hover:underline">ساخت پست جدید</Link></div>
      ) : (
        <div className="card divide-y divide-line overflow-hidden">
          {filtered.map((p) => (
            <div key={p.id} className="flex flex-wrap items-center gap-3 p-4">
              <div className="minw-0 flex-1">
                <Link to={`/admin/posts/${p.id}`} className="font-bold hover:text-accent">{p.title || "بدون عنوان"}</Link>
                <p className="truncate text-xs text-muted">/{p.slug} · {p.category || "—"} · {formatDate(p.updatedAt)}</p>
              </div>
              <StatusPill status={p.status} />
              <div className="flex items-center gap-1.5">
                <button type="button" onClick={() => togglePublish(p)} className={cn("btn text-sm", p.status === "published" ? "btn-secondary" : "btn-primary")}>{p.status === "published" ? "لغو انتشار" : "انتشار"}</button>
                <Link to={`/admin/posts/${p.id}`} className="btn btn-secondary px-3 text-sm">ویرایش</Link>
                <button type="button" onClick={() => setToDelete(p)} aria-label="حذف" className="grid h-10 w-10 place-items-center rounded-lg border border-line text-danger hover:border-danger"><Trash className="h-4 w-4" /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      <ConfirmDialog open={!!toDelete} title="حذف پست" message={`آیا «${toDelete?.title || "این پست"}» حذف شود؟ این عمل قابل بازگشت نیست و پست از سایت برداشته می‌شود.`} confirmText="حذف" danger onConfirm={doDelete} onCancel={() => setToDelete(null)} />
    </div>
  );
}
