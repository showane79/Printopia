import { useState } from "react";
import { useNavigate } from "react-router-dom";
import type { MaterialId } from "@/data/products";
import { materials, type Product } from "@/data/products";
import { useStore } from "@/context/StoreContext";
import { Cart, Check, Close, Heart, Minus, Plus, Upload } from "@/components/icons";
import { Badge } from "@/components/Badge";
import { unitPrice } from "@/utils/product";
import { formatPrice, formatNumber, toPersianDigits } from "@/utils/format";
import { cn } from "@/utils/cn";

const ENGRAVING_FEE = 40_000;

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <p className="mb-2 text-sm font-bold">{children}</p>;
}

export function ProductCustomizer({ product }: { product: Product }) {
  const { addToCart, toggleWishlist, isWishlisted } = useStore();
  const navigate = useNavigate();

  const [material, setMaterial] = useState<MaterialId>(product.materials[0] ?? product.material);
  const [color, setColor] = useState(product.colors[0]?.name ?? "");
  const [size, setSize] = useState(product.sizes[0]?.name ?? "");
  const [qty, setQty] = useState(1);
  const [engraving, setEngraving] = useState("");
  const [fileName, setFileName] = useState("");
  const [note, setNote] = useState("");

  const wished = isWishlisted(product.id);
  const base = unitPrice(product, size);
  const hasEngraving = engraving.trim().length > 0;
  const fee = product.customizable && hasEngraving ? ENGRAVING_FEE : 0;
  const total = (base + fee) * qty;

  function buildOptions() {
    return {
      material: String(material),
      color,
      size,
      engraving: hasEngraving ? engraving.trim() : undefined,
    };
  }
  function handleAdd() {
    addToCart(product, buildOptions(), qty);
  }
  function handleBuyNow() {
    addToCart(product, buildOptions(), qty);
    navigate("/checkout");
  }

  return (
    <div className="card flex flex-col gap-5 p-5 md:p-6">
      {/* availability */}
      <div className="flex items-center justify-between">
        {product.inStock ? (
          <Badge variant="success">
            <Check className="h-3.5 w-3.5" /> موجود
          </Badge>
        ) : (
          <Badge variant="danger">ناموجود</Badge>
        )}
        <span className="text-xs text-muted">کد محصول: {toPersianDigits(product.id.toUpperCase())}</span>
      </div>

      {/* material */}
      <div>
        <FieldLabel>متریال</FieldLabel>
        <div className="flex flex-wrap gap-2">
          {product.materials.map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMaterial(m)}
              title={materials[m].note}
              aria-pressed={material === m}
              className={cn(
                "rounded-xl border px-3 py-2 text-sm font-bold transition",
                material === m ? "border-accent bg-accent/10 text-accent" : "border-line bg-surface2 hover:border-accent/50"
              )}
            >
              {materials[m].label}
            </button>
          ))}
        </div>
      </div>

      {/* color */}
      {product.colors.length > 0 && (
        <div>
          <FieldLabel>رنگ: <span className="text-muted">{color}</span></FieldLabel>
          <div className="flex flex-wrap gap-2">
            {product.colors.map((c) => (
              <button
                key={c.name}
                type="button"
                onClick={() => setColor(c.name)}
                aria-pressed={color === c.name}
                title={c.name}
                aria-label={c.name}
                className={cn(
                  "h-9 w-9 rounded-full border-2 transition",
                  color === c.name ? "border-accent ring-2 ring-accent/30" : "border-line"
                )}
                style={{ backgroundColor: c.hex }}
              />
            ))}
          </div>
        </div>
      )}

      {/* size */}
      {product.sizes.length > 0 && (
        <div>
          <FieldLabel>اندازه</FieldLabel>
          <div className="flex flex-wrap gap-2">
            {product.sizes.map((s) => (
              <button
                key={s.name}
                type="button"
                onClick={() => setSize(s.name)}
                aria-pressed={size === s.name}
                className={cn(
                  "rounded-xl border px-3 py-2 text-sm font-semibold transition",
                  size === s.name ? "border-accent bg-accent/10 text-accent" : "border-line bg-surface2 hover:border-accent/50"
                )}
              >
                {s.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* customization */}
      {product.customizable && (
        <div className="rounded-2xl border border-accent2/30 bg-accent2/5 p-4">
          <p className="mb-3 flex items-center gap-2 text-sm font-bold text-accent2">
            شخصی‌سازی این محصول
          </p>
          <label className="mb-1 block text-xs text-muted" htmlFor="engrave">
            نام / متن حک‌شده (اختیاری، +{formatPrice(ENGRAVING_FEE)})
          </label>
          <input
            id="engrave"
            className="input"
            maxLength={24}
            placeholder="مثلاً نام یا تاریخ"
            value={engraving}
            onChange={(e) => setEngraving(e.target.value)}
          />

          <label className="mb-1 mt-3 block text-xs text-muted" htmlFor="ref-file">
            تصویر یا فایل مرجع (اختیاری)
          </label>
          {fileName ? (
            <div className="flex items-center justify-between gap-2 rounded-xl border border-line bg-surface2 px-3 py-2 text-sm">
              <span className="truncate">{fileName}</span>
              <button
                type="button"
                onClick={() => setFileName("")}
                aria-label="حذف فایل"
                className="text-muted hover:text-danger"
              >
                <Close className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <label
              htmlFor="ref-file"
              className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-line bg-surface2 px-3 py-3 text-sm text-muted transition hover:border-accent hover:text-accent"
            >
              <Upload className="h-4 w-4" />
              بارگذاری فایل (STL / OBJ / تصویر)
              <input
                id="ref-file"
                type="file"
                className="sr-only"
                accept=".stl,.obj,.3mf,image/*"
                onChange={(e) => setFileName(e.target.files?.[0]?.name ?? "")}
              />
            </label>
          )}

          <label className="mb-1 mt-3 block text-xs text-muted" htmlFor="note">
            توضیحات تکمیلی
          </label>
          <textarea
            id="note"
            className="input min-h-20 resize-y"
            rows={2}
            placeholder="هر نکته‌ای که می‌خواهید بدانیم..."
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </div>
      )}

      {/* quantity */}
      <div className="flex items-center justify-between">
        <FieldLabel>تعداد</FieldLabel>
        <div className="flex items-center gap-1 rounded-xl border border-line bg-surface2 p-1">
          <button
            type="button"
            onClick={() => setQty((q) => Math.max(1, q - 1))}
            className="grid h-9 w-9 place-items-center rounded-lg hover:bg-surface"
            aria-label="کاهش تعداد"
          >
            <Minus className="h-4 w-4" />
          </button>
          <span className="w-10 text-center font-bold" aria-live="polite">
            {toPersianDigits(qty)}
          </span>
          <button
            type="button"
            onClick={() => setQty((q) => q + 1)}
            className="grid h-9 w-9 place-items-center rounded-lg hover:bg-surface"
            aria-label="افزایش تعداد"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* price */}
      <div className="flex items-end justify-between rounded-2xl bg-surface2 p-4">
        <span className="text-sm text-muted">قابل پرداخت</span>
        <div className="text-end">
          <div className="text-2xl font-extrabold">{formatPrice(total)}</div>
          {qty > 1 && (
            <div className="text-xs text-muted">({formatPrice(base + fee)} × {formatNumber(qty)})</div>
          )}
        </div>
      </div>

      {/* actions */}
      <div className="flex flex-col gap-2 sm:flex-row">
        <button type="button" onClick={handleAdd} disabled={!product.inStock} className="btn btn-primary flex-1">
          <Cart className="h-5 w-5" /> افزودن به سبد خرید
        </button>
        <button type="button" onClick={handleBuyNow} disabled={!product.inStock} className="btn btn-accent2 flex-1">
          خرید فوری
        </button>
        <button
          type="button"
          onClick={() => toggleWishlist(product)}
          aria-pressed={wished}
          aria-label={wished ? "حذف از علاقه‌مندی‌ها" : "افزودن به علاقه‌مندی‌ها"}
          className={cn("btn btn-secondary px-4", wished && "border-accent text-accent")}
        >
          <Heart filled={wished} className="h-5 w-5" />
        </button>
      </div>

      {/* notes */}
      <div className="grid grid-cols-2 gap-3 border-t border-line pt-4 text-xs text-muted">
        <div>
          <span className="block font-bold text-fg">زمان تولید</span>
          {formatNumber(product.productionDays)} روز کاری (تقریبی)
        </div>
        <div>
          <span className="block font-bold text-fg">ارسال</span>
          از {formatPrice(0)} (رایگان بالای ۵۰۰٬۰۰۰)
        </div>
      </div>
    </div>
  );
}
