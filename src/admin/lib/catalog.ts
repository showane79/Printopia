import { products as bundled, type Product } from "@/data/products";
import { listAdminProducts } from "../services/repository";
import type { AdminProduct } from "../types";

// Bridge: admin product edits/new products are merged over the bundled catalog
// so storefront pages reflect real changes. Draft products are hidden.

function mergeProduct(base: Product, a: AdminProduct): Product {
  return {
    ...base,
    title: a.title,
    subtitle: a.subtitle,
    category: a.category,
    price: a.price,
    oldPrice: a.oldPrice,
    image: a.image || base.image,
    customizable: a.customizable,
    inStock: a.inStock,
    featured: a.featured,
    badge: a.badge,
    productionDays: a.productionDays,
    shortDesc: a.shortDesc,
    description: a.description,
  };
}

function adminProductToProduct(a: AdminProduct): Product {
  return {
    id: a.id,
    slug: a.slug,
    title: a.title,
    subtitle: a.subtitle,
    category: a.category,
    collectionIds: [],
    price: a.price,
    oldPrice: a.oldPrice,
    image: a.image || "",
    material: (a.material as Product["material"]) || "PLA",
    materials: ["PLA", "PETG"],
    colors: [
      { name: "مشکی", hex: "#1c2230" },
      { name: "سفید", hex: "#e9ecf2" },
    ],
    sizes: [{ name: "استاندارد", delta: 0 }],
    customizable: a.customizable,
    inStock: a.inStock,
    suitableFor: [],
    badge: a.badge,
    featured: a.featured,
    productionDays: a.productionDays,
    shortDesc: a.shortDesc,
    description: a.description,
    features: [],
    specs: [],
    care: "با پارچهٔ نرم پاک کنید و از گرما و رطوبت زیاد دور نگه دارید.",
  };
}

export function getProducts(): Product[] {
  const admin = listAdminProducts();
  const overrides: Product[] = [];
  const additions: Product[] = [];
  const seen = new Set<string>();
  admin
    .filter((a) => a.status === "published")
    .forEach((a) => {
      const base = bundled.find((p) => p.id === a.id);
      if (base) overrides.push(mergeProduct(base, a));
      else additions.push(adminProductToProduct(a));
      seen.add(a.id);
    });
  // Bundled products that are inactive (draft) are removed; others stay.
  const inactive = new Set(
    admin.filter((a) => a.status !== "published").map((a) => a.id)
  );
  const untouched = bundled.filter((p) => !seen.has(p.id) && !inactive.has(p.id));
  return [...additions, ...overrides, ...untouched];
}

export function getProductBySlug(slug: string): Product | undefined {
  return getProducts().find((p) => p.slug === slug);
}

export function getRelatedProducts(product: Product, limit = 4): Product[] {
  const all = getProducts();
  return all
    .filter((p) => p.id !== product.id && p.category === product.category)
    .concat(all.filter((p) => p.id !== product.id))
    .filter((p, i, arr) => arr.findIndex((x) => x.id === p.id) === i)
    .slice(0, limit);
}
