import { useState } from "react";
import { Link } from "react-router-dom";
import {
  deleteAdminProduct,
  duplicateAdminProduct,
  listAdminProducts,
  saveAdminProduct,
} from "../services/repository";
import { categories } from "@/data/catalog";
import { useStore } from "@/context/StoreContext";
import { PageHeader, ConfirmDialog } from "../ui";
import { Plus, Search, Trash } from "@/components/icons";
import { formatPrice, formatDate, toPersianDigits } from "@/utils/format";
import { cn } from "@/utils/cn";
import type { AdminProduct } from "../types";

const sortOptions = [
  { value: "updated", label: "بر اساس ویرایش" },
  { value: "title", label: "بر اساس عنوان" },
  { value: "price", label: "بر اساس قیمت" },
];

export default function Products() {
  const { pushToast } = useStore();
  const [, setTick] = useState(0);
  const refresh = () => setTick((t) => t + 1);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const [sort, setSort] = useState("updated");
  const [toDelete, setToDelete] = useState<AdminProduct | null>(null);

  const all = listAdminProducts();
  const filtered = all
    .filter((p) => (status === "all" ? true : p.status === status))
    .filter((p) => {
      const n = q.trim();
      return !n || p.title.includes(n) || p.slug.includes(n) || p.category.includes(n);
    })
    .sort((a, b) => {
      if (sort === "title") return a.title.localeCompare(b.title, "fa");
      if (sort === "price") return a.price - b.price;
      return b.updatedAt.localeCompare(a.updatedAt);
    });

  function togglePublish(p: AdminProduct) {
    saveAdminProduct({ ...p, status: p.status === "published" ? "draft" : "published" });
    pushToast(p.status === "published" ? "محصول از نمایش برداشته شد (پیش‌نویس)" : "محصول منتشر شد و در سایت نمایش داده می‌شود");
    refresh();
  }

  function duplicate(id: string) {
    duplicateAdminProduct(id);
    pushToast("یک کپی به‌عنوان پیش‌نویس ساخته شد");
    refresh();
  }

  function doDelete() {
    if (!toDelete) return;
    deleteAdminProduct(toDelete.id);
    pushToast("محصول حذف شد", "info");
    setToDelete(null);
    refresh();
  }

  return (
    <div>
      <PageHeader
        title="محصولات"
        subtitle={`${toPersianDigits(all.filter((p) => p.status === "published").length)} فعال · ${toPersianDigits(all.length)} کل`}
        action={
          <Link to="/admin/products/new" className="btn btn-primary">
            <Plus className="h-5 w-5" /> محصول جدید
          </Link>
        }
      />

      <div className="card mb-5 grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="relative lg:col-span-2">
          <span className="pointer-events-none absolute inset-y-0 grid w-10 place-items-center text-muted" style={{ insetInlineStart: 0 }}>
            <Search className="h-5 w-5" />
          </span>
          <input className="input pe-3" style={{ paddingInlineStart: "2.6rem" }} placeholder="جستجوی نام، اسلاگ یا دسته..." value={q} onChange={(e) => setQ(e.target.value)} aria-label="جستجو" />
        </div>
        <select className="input" value={status} onChange={(e) => setStatus(e.target.value)} aria-label="وضعیت">
          <option value="all">همهٔ وضعیت‌ها</option>
          <option value="published">فعال (منتشرشده)</option>
          <option value="draft">پیش‌نویس</option>
        </select>
        <select className="input" value={sort} onChange={(e) => setSort(e.target.value)} aria-label="مرتب‌سازی">
          {sortOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="card p-10 text-center text-muted">
          محصولی پیدا نشد.{" "}
          <Link to="/admin/products/new" className="text-accent hover:underline">افزودن محصول جدید</Link>
        </div>
      ) : (
        <div className="card divide-y divide-line overflow-hidden">
          {filtered.map((p) => {
            const cat = categories.find((c) => c.id === p.category)?.name ?? "—";
            return (
              <div key={p.id} className="flex flex-wrap items-center gap-3 p-4">
                <div className="minw-0 flex-1">
                  <Link to={`/admin/products/${p.id}`} className="font-bold hover:text-accent">{p.title || "بدون عنوان"}</Link>
                  <p className="truncate text-xs text-muted">
                    /{p.slug} · {cat} · {formatPrice(p.price)} · {formatDate(p.updatedAt)}
                  </p>
                </div>
                <span className={cn("chip", p.status === "published" ? "border-success/30 bg-success/12 text-success" : "border-line bg-surface2/60 text-muted")}>
                  {p.status === "published" ? "فعال" : "پیش‌نویس"}
                </span>
                <div className="flex items-center gap-1.5">
                  <button type="button" onClick={() => togglePublish(p)} className={cn("btn px-3 text-sm", p.status === "published" ? "btn-secondary" : "btn-primary")}>
                    {p.status === "published" ? "غیرفعال" : "انتشار"}
                  </button>
                  <button type="button" onClick={() => duplicate(p.id)} className="btn btn-secondary px-3 text-sm">کپی</button>
                  <Link to={`/admin/products/${p.id}`} className="btn btn-secondary px-3 text-sm">ویرایش</Link>
                  <button type="button" onClick={() => setToDelete(p)} aria-label="حذف" className="grid h-10 w-10 place-items-center rounded-lg border border-line text-danger hover:border-danger">
                    <Trash className="h-4 w-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <ConfirmDialog
        open={!!toDelete}
        title="حذف محصول"
        message={`آیا «${toDelete?.title || "این محصول"}» حذف شود؟ این عمل قابل بازگشت نیست.`}
        confirmText="حذف"
        danger
        onConfirm={doDelete}
        onCancel={() => setToDelete(null)}
      />
    </div>
  );
}
