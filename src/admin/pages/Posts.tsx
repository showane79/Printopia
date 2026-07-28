import { useState } from "react";
import { Link } from "react-router-dom";
import { localRepository, localPublisher } from "../services/repository";
import { useStore } from "@/context/StoreContext";
import { PageHeader, StatusPill, ConfirmDialog } from "../ui";
import { Plus, Search, Trash } from "@/components/icons";
import { formatDate, toPersianDigits } from "@/utils/format";
import { cn } from "@/utils/cn";
import type { AdminPost } from "../types";

export default function Posts() {
  const { pushToast } = useStore();
  const [, setTick] = useState(0);
  const refresh = () => setTick((t) => t + 1);

  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const [cat, setCat] = useState("all");
  const [sort, setSort] = useState("updated");
  const [toDelete, setToDelete] = useState<AdminPost | null>(null);

  const posts = localRepository.listPosts();
  const categories = localRepository.listCategories();

  const filtered = posts
    .filter((p) => (status === "all" ? true : p.status === status))
    .filter((p) => (cat === "all" ? true : p.category === cat))
    .filter((p) => {
      const n = q.trim();
      return !n || p.title.includes(n) || p.slug.includes(n);
    })
    .sort((a, b) => {
      if (sort === "updated") return b.updatedAt.localeCompare(a.updatedAt);
      return (b.publishDate || "").localeCompare(a.publishDate || "");
    });

  async function togglePublish(p: AdminPost) {
    if (p.status === "published") {
      await localPublisher.unpublish(p);
      pushToast("انتشار مقاله لغو شد", "info");
    } else {
      const r = await localPublisher.publish(p);
      pushToast(r.message);
    }
    refresh();
  }

  async function doDelete() {
    if (!toDelete) return;
    await localPublisher.remove(toDelete);
    pushToast("مقاله حذف شد", "info");
    setToDelete(null);
    refresh();
  }

  return (
    <div>
      <PageHeader
        title="مقالات"
        subtitle={`${toPersianDigits(posts.length)} مقاله`}
        action={
          <Link to="/admin/posts/new" className="btn btn-primary">
            <Plus className="h-5 w-5" /> مقاله جدید
          </Link>
        }
      />

      {/* filters */}
      <div className="card mb-5 grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="relative lg:col-span-2">
          <span className="pointer-events-none absolute inset-y-0 grid w-10 place-items-center text-muted" style={{ insetInlineStart: 0 }}>
            <Search className="h-5 w-5" />
          </span>
          <input className="input pe-3" style={{ paddingInlineStart: "2.6rem" }} placeholder="جستجوی عنوان یا اسلاگ..." value={q} onChange={(e) => setQ(e.target.value)} aria-label="جستجو" />
        </div>
        <select className="input" value={status} onChange={(e) => setStatus(e.target.value)} aria-label="وضعیت">
          <option value="all">همهٔ وضعیت‌ها</option>
          <option value="published">منتشرشده</option>
          <option value="draft">پیش‌نویس</option>
          <option value="archived">بایگانی‌شده</option>
        </select>
        <select className="input" value={cat} onChange={(e) => setCat(e.target.value)} aria-label="دسته‌بندی">
          <option value="all">همهٔ دسته‌ها</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>

      <div className="mb-3 flex items-center justify-between text-sm text-muted">
        <span>{toPersianDigits(filtered.length)} نتیجه</span>
        <select className="input w-auto" value={sort} onChange={(e) => setSort(e.target.value)} aria-label="مرتب‌سازی">
          <option value="updated">بر اساس ویرایش</option>
          <option value="published">بر اساس انتشار</option>
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="card p-10 text-center text-muted">
          مقاله‌ای پیدا نشد.{" "}
          <Link to="/admin/posts/new" className="text-accent hover:underline">ساخت مقاله جدید</Link>
        </div>
      ) : (
        <div className="card divide-y divide-line overflow-hidden">
          {filtered.map((p) => (
            <div key={p.id} className="flex flex-wrap items-center gap-3 p-4">
              <div className="minw-0 flex-1">
                <Link to={`/admin/posts/${p.id}`} className="font-bold hover:text-accent">
                      {p.title || "بدون عنوان"}
                </Link>
                <p className="truncate text-xs text-muted">
                  /{p.slug} · {categories.find((c) => c.id === p.category)?.name ?? "—"} · {formatDate(p.updatedAt)}
                </p>
              </div>
              <StatusPill status={p.status} />
              <div className="flex items-center gap-1.5">
                <button type="button" onClick={() => togglePublish(p)} className={cn("btn text-sm", p.status === "published" ? "btn-secondary" : "btn-primary")}>
                  {p.status === "published" ? "لغو انتشار" : "انتشار"}
                </button>
                <Link to={`/admin/posts/${p.id}`} className="btn btn-secondary px-3 text-sm">ویرایش</Link>
                <button type="button" onClick={() => setToDelete(p)} aria-label="حذف" className="grid h-10 w-10 place-items-center rounded-lg border border-line text-danger hover:border-danger">
                  <Trash className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={!!toDelete}
        title="حذف مقاله"
        message={`آیا «${toDelete?.title || "این مقاله"}» حذف شود؟ این عمل قابل بازگشت نیست.`}
        confirmText="حذف"
        danger
        onConfirm={doDelete}
        onCancel={() => setToDelete(null)}
      />
    </div>
  );
}
