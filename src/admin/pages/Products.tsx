import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  deleteAdminProduct,
  duplicateAdminProduct,
  listAdminProducts,
  saveAdminProduct,
} from "../services/repository";
import { invalidateProducts } from "../lib/catalog";
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
  const [all, setAll] = useState<AdminProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const [sort, setSort] = useState("updated");
  const [toDelete, setToDelete] = useState<AdminProduct | null>(null);

  // Always re-read from the server so the list reflects committed state.
  const reload = useCallback(async () => {
    try {
      const list = await listAdminProducts();
      setAll(list);
      setError("");
    } catch {
      setError("بارگذاری محصولات ناموفق بود.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

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

  async function togglePublish(p: AdminProduct) {
    setBusy(true);
    const publishing = p.status !== "published";
    try {
      await saveAdminProduct({ ...p, status: publishing ? "published" : "draft" });
      invalidateProducts();
      await reload();
      pushToast(
        publishing
          ? "محصول منتشر شد و در سایت نمایش داده می‌شود"
          : "محصول از نمایش برداشته شد (پیش‌نویس)"
      );
    } catch {
      pushToast("ذخیره ناموفق بود؛ دوباره تلاش کنید.", "error");
    } finally {
      setBusy(false);
    }
  }

  async function duplicate(id: string) {
    setBusy(true);
    try {
      await duplicateAdminProduct(id);
      invalidateProducts();
      await reload();
      pushToast("یک کپی به‌عنوان پیش‌نویس ساخته شد");
    } catch {
      pushToast("کپی ناموفق بود.", "error");
    } finally {
      setBusy(false);
    }
  }

  async function doDelete() {
    if (!toDelete) return;
    const target = toDelete;
    setToDelete(null);
    setBusy(true);
    try {
      await deleteAdminProduct(target.id);
      invalidateProducts();
      await reload();
      pushToast("محصول حذف شد", "info");
    } catch {
      pushToast("حذف ناموفق بود.", "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="محصولات"
        subtitle={
          loading
            ? "در حال بارگذاری…"
            : `${toPersianDigits(all.filter((p) => p.status === "published").length)} فعال · ${toPersianDigits(all.length)} کل`
        }
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

      {loading ? (
        <div className="card p-10 text-center text-muted" aria-busy="true">
          <span className="mx-auto block h-7 w-7 animate-spin rounded-full border-2 border-accent border-t-transparent" />
          <p className="mt-3 text-sm">در حال بارگذاری محصولات…</p>
        </div>
      ) : error ? (
        <div className="card p-10 text-center text-muted">
          {error}{" "}
          <button type="button" onClick={() => void reload()} className="text-accent hover:underline">
            تلاش دوباره
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="card p-10 text-center text-muted">
          محصولی پیدا نشد.{" "}
          <Link to="/admin/products/new" className="text-accent hover:underline">افزودن محصول جدید</Link>
        </div>
      ) : (
        <div className={cn("card divide-y divide-line overflow-hidden", busy && "pointer-events-none opacity-60")}>
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
                  <button type="button" disabled={busy} onClick={() => void togglePublish(p)} className={cn("btn px-3 text-sm", p.status === "published" ? "btn-secondary" : "btn-primary")}>
                    {p.status === "published" ? "غیرفعال" : "انتشار"}
                  </button>
                  <button type="button" disabled={busy} onClick={() => void duplicate(p.id)} className="btn btn-secondary px-3 text-sm">کپی</button>
                  <Link to={`/admin/products/${p.id}`} className="btn btn-secondary px-3 text-sm">ویرایش</Link>
                  <button type="button" disabled={busy} onClick={() => setToDelete(p)} aria-label="حذف" className="grid h-10 w-10 place-items-center rounded-lg border border-line text-danger hover:border-danger">
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
        onConfirm={() => void doDelete()}
        onCancel={() => setToDelete(null)}
      />
    </div>
  );
}
