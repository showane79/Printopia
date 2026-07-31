import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import type { MaterialId } from "@/data/products";
import { materials, type Product } from "@/data/products";
import { useStore } from "@/context/StoreContext";
import { Modal } from "@/components/Modal";
import { RatingStars } from "@/components/RatingStars";
import { Badge } from "@/components/Badge";
import { Cart, Truck } from "@/components/icons";
import { unitPrice } from "@/utils/product";
import { formatPrice } from "@/utils/format";
import { imgFallback } from "@/utils/img";
import { cn } from "@/utils/cn";

export function QuickView({
  product,
  open,
  onClose,
}: {
  product: Product | null;
  open: boolean;
  onClose: () => void;
}) {
  const { addToCart } = useStore();
  const [material, setMaterial] = useState<MaterialId>();
  const [color, setColor] = useState("");
  const [size, setSize] = useState("");

  useEffect(() => {
    if (product) {
      setMaterial(product.materials[0] ?? product.material);
      setColor(product.colors[0]?.name ?? "");
      setSize(product.sizes[0]?.name ?? "");
    }
  }, [product]);

  if (!product) return null;
  const total = unitPrice(product, size);

  function addAndClose() {
    if (!product || !material) return;
    addToCart(product, { material: String(material), color, size });
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title="مشاهده سریع" size="lg">
      <div className="grid md:grid-cols-2">
        <div className="aspect-square bg-surface2 md:aspect-auto">
          <img {...imgFallback} src={product.image} alt={product.title} className="h-full w-full object-cover" />
        </div>
        <div className="flex flex-col gap-4 p-5 md:p-6">
          <div className="flex items-center justify-between gap-2">
            <Badge variant="neutral">{materials[product.material].label}</Badge>
            {product.customizable && <span className="text-xs text-accent2">قابل شخصی‌سازی</span>}
          </div>
          <h3 className="text-xl font-extrabold leading-8">{product.title}</h3>
          <p className="text-sm leading-7 text-muted">{product.shortDesc}</p>
          <RatingStars />
          <div className="text-2xl font-extrabold">{formatPrice(total)}</div>

          <div>
            <p className="mb-2 text-sm font-bold">متریال</p>
            <div className="flex flex-wrap gap-2">
              {product.materials.map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMaterial(m)}
                  className={cn(
                    "rounded-xl border px-3 py-1.5 text-sm font-bold transition",
                    material === m ? "border-accent bg-accent/10 text-accent" : "border-line bg-surface2"
                  )}
                >
                  {materials[m].label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-2 text-sm font-bold">رنگ: <span className="text-muted">{color}</span></p>
            <div className="flex flex-wrap gap-2">
              {product.colors.map((c) => (
                <button
                  key={c.name}
                  type="button"
                  onClick={() => setColor(c.name)}
                  aria-label={c.name}
                  className={cn(
                    "h-8 w-8 rounded-full border-2 transition",
                    color === c.name ? "border-accent ring-2 ring-accent/30" : "border-line"
                  )}
                  style={{ backgroundColor: c.hex }}
                />
              ))}
            </div>
          </div>

          <div className="mt-auto flex flex-col gap-2">
            <button type="button" onClick={addAndClose} className="btn btn-primary">
              <Cart className="h-5 w-5" /> افزودن به سبد خرید
            </button>
            <Link to={`/product/${product.slug}`} onClick={onClose} className="btn btn-secondary">
              مشاهده صفحهٔ کامل محصول
            </Link>
            <p className="flex items-center justify-center gap-1.5 text-xs text-muted">
              <Truck className="h-4 w-4" /> ارسال سریع به سراسر ایران
            </p>
          </div>
        </div>
      </div>
    </Modal>
  );
}
