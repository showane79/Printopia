import type { Product } from "@/data/products";

export function defaultOptions(p: Product) {
  return {
    material: String(p.materials[0] ?? p.material),
    color: p.colors[0]?.name ?? "",
    size: p.sizes[0]?.name ?? "",
  };
}

export function sizeDelta(p: Product, sizeName: string): number {
  return p.sizes.find((s) => s.name === sizeName)?.delta ?? 0;
}

export function unitPrice(p: Product, sizeName: string): number {
  return p.price + sizeDelta(p, sizeName);
}
