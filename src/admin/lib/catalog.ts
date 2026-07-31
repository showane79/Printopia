/**
 * Public product catalog — reads from the server API (D1).
 *
 * Source of truth: /api/products (published products only).
 * The bundled catalog in @/data/products is a DEV-ONLY fallback, used when the
 * API is unreachable (e.g. `npm run dev` with no Worker). In production on
 * Cloudflare the API always answers, so D1 is the single source of truth.
 */

import { useEffect, useMemo, useState } from "react";
import { products as bundled, type Product } from "@/data/products";
import { apiListPublishedProducts } from "../services/api";

function toProduct(r: Awaited<ReturnType<typeof apiListPublishedProducts>>[number]): Product {
  return {
    id: r.id,
    slug: r.slug,
    title: r.title,
    subtitle: r.subtitle,
    category: r.category,
    collectionIds: [],
    price: r.price,
    oldPrice: r.oldPrice,
    image: r.image || "",
    material: (r.material as Product["material"]) || "PLA",
    materials: [(r.material as Product["material"]) || "PLA"],
    colors: (r.colors as Product["colors"])?.length
      ? (r.colors as Product["colors"])
      : [
          { name: "مشکی", hex: "#1c2230" },
          { name: "سفید", hex: "#e9ecf2" },
        ],
    sizes: (r.sizes as Product["sizes"])?.length
      ? (r.sizes as Product["sizes"])
      : [{ name: "استاندارد", delta: 0 }],
    customizable: r.customizable,
    inStock: r.inStock,
    suitableFor: [],
    badge: r.badge,
    featured: r.featured,
    productionDays: r.productionDays,
    shortDesc: r.shortDesc,
    description: r.description,
    features: r.features || [],
    specs: (r.specs as Product["specs"]) || [],
    care: r.care || "با پارچهٔ نرم پاک کنید و از گرما و رطوبت زیاد دور نگه دارید.",
  };
}

/** Module-level cache so multiple components share one request per page load. */
let cache: Product[] | null = null;
let inflight: Promise<Product[]> | null = null;

export async function fetchProducts(force = false): Promise<Product[]> {
  if (cache && !force) return cache;
  if (inflight && !force) return inflight;
  inflight = (async () => {
    try {
      const rows = await apiListPublishedProducts();
      cache = rows.map(toProduct);
    } catch {
      // Dev-only fallback: no Worker running.
      cache = bundled;
    }
    inflight = null;
    return cache;
  })();
  return inflight;
}

/** Invalidate after an admin mutation so the storefront reflects changes. */
export function invalidateProducts() {
  cache = null;
  inflight = null;
}

export interface ProductsState {
  products: Product[];
  loading: boolean;
}

/** Storefront hook — loads published products from the server. */
export function useProducts(): ProductsState {
  const [products, setProducts] = useState<Product[]>(() => cache ?? []);
  const [loading, setLoading] = useState(cache === null);

  useEffect(() => {
    if (cache) {
      setProducts(cache);
      setLoading(false);
      return;
    }
    let alive = true;
    setLoading(true);
    fetchProducts().then((list) => {
      if (!alive) return;
      setProducts(list);
      setLoading(false);
    });
    return () => {
      alive = false;
    };
  }, []);

  return { products, loading };
}

export function useProductBySlug(slug: string | undefined) {
  const { products, loading } = useProducts();
  const product = useMemo(
    () => (slug ? products.find((p) => p.slug === slug) : undefined),
    [products, slug]
  );
  return { product, loading };
}

export function useRelatedProducts(product: Product | undefined, limit = 4): Product[] {
  const { products } = useProducts();
  return useMemo(() => {
    if (!product) return [];
    return products
      .filter((p) => p.id !== product.id && p.category === product.category)
      .concat(products.filter((p) => p.id !== product.id))
      .filter((p, i, arr) => arr.findIndex((x) => x.id === p.id) === i)
      .slice(0, limit);
  }, [products, product, limit]);
}
