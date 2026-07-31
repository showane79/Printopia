/**
 * API client for server-backed content storage.
 * Replaces localStorage with durable D1-backed endpoints.
 */

import type {
  AdminPost,
  AdminProduct,
  AdminCategory,
  AdminPage,
  AdminSettings,
  AdminNavItem,
  AdminAppearance,
  AdminSeo,
  AdminRedirect,
  PostStatus,
} from "../types";

interface ApiResponse<T = unknown> {
  ok: boolean;
  message?: string;
  code?: string;
  [key: string]: unknown;
}

class ApiError extends Error {
  constructor(
    public code: string,
    message: string,
    public status: number
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });

  const data = (await res.json().catch(() => ({}))) as ApiResponse<T>;

  if (!res.ok) {
    throw new ApiError(
      data.code || "API_ERROR",
      data.message || `HTTP ${res.status}`,
      res.status
    );
  }

  return data as T;
}

// ---- Posts ----------------------------------------------------------------
export async function apiListPosts(): Promise<AdminPost[]> {
  const data = await apiFetch<{ posts: AdminPost[] }>("/api/admin/posts");
  return data.posts || [];
}

export async function apiCreatePost(post: Partial<AdminPost>): Promise<AdminPost> {
  const data = await apiFetch<{ post: AdminPost }>("/api/admin/posts", {
    method: "POST",
    body: JSON.stringify(post),
  });
  return data.post;
}

export async function apiUpdatePost(id: string, post: Partial<AdminPost>): Promise<AdminPost> {
  const data = await apiFetch<{ post: AdminPost }>(`/api/admin/posts/${encodeURIComponent(id)}`, {
    method: "PUT",
    body: JSON.stringify(post),
  });
  return data.post;
}

export async function apiDeletePost(id: string): Promise<void> {
  await apiFetch(`/api/admin/posts/${encodeURIComponent(id)}`, { method: "DELETE" });
}

// ---- Products -------------------------------------------------------------
export async function apiListProducts(): Promise<AdminProduct[]> {
  const data = await apiFetch<{ products: AdminProduct[] }>("/api/admin/products");
  return data.products || [];
}

export async function apiCreateProduct(product: Partial<AdminProduct>): Promise<AdminProduct> {
  const data = await apiFetch<{ product: AdminProduct }>("/api/admin/products", {
    method: "POST",
    body: JSON.stringify(product),
  });
  return data.product;
}

export async function apiUpdateProduct(id: string, product: Partial<AdminProduct>): Promise<AdminProduct> {
  const data = await apiFetch<{ product: AdminProduct }>(`/api/admin/products/${encodeURIComponent(id)}`, {
    method: "PUT",
    body: JSON.stringify(product),
  });
  return data.product;
}

export async function apiDeleteProduct(id: string): Promise<void> {
  await apiFetch(`/api/admin/products/${encodeURIComponent(id)}`, { method: "DELETE" });
}

// ---- Config blobs ---------------------------------------------------------
export async function apiGetConfig<T>(key: string): Promise<T | null> {
  const data = await apiFetch<{ value: T | null }>(`/api/admin/config/${encodeURIComponent(key)}`);
  return data.value;
}

export async function apiSetConfig<T>(key: string, value: T): Promise<void> {
  await apiFetch(`/api/admin/config/${encodeURIComponent(key)}`, {
    method: "PUT",
    body: JSON.stringify({ value }),
  });
}

// ---- Dashboard stats ------------------------------------------------------
export async function apiGetStats(): Promise<{ posts: { published: number; drafts: number }; products: { active: number } }> {
  return apiFetch("/api/admin/stats");
}

// ---- Public endpoints (no auth required) ----------------------------------
export async function apiListPublishedPosts(): Promise<Array<{
  slug: string;
  title: string;
  excerpt: string;
  category: string;
  author: string;
  date: string;
  readingMinutes: number;
  image: string;
  content: unknown[];
}>> {
  const data = await apiFetch<{ posts: unknown[] }>("/api/posts");
  return data.posts as any[];
}

export async function apiGetPublishedPost(slug: string) {
  const data = await apiFetch<{ post: unknown }>(`/api/posts/${encodeURIComponent(slug)}`);
  return data.post;
}

export async function apiListPublishedProducts(): Promise<Array<{
  id: string;
  slug: string;
  title: string;
  subtitle: string;
  category: string;
  price: number;
  oldPrice?: number;
  image: string;
  shortDesc: string;
  description: string;
  material: string;
  colors: unknown[];
  sizes: unknown[];
  features: string[];
  specs: unknown[];
  care: string;
  badge?: string;
  customizable: boolean;
  inStock: boolean;
  featured: boolean;
  productionDays: number;
}>> {
  const data = await apiFetch<{ products: unknown[] }>("/api/products");
  return data.products as any[];
}

export async function apiGetPublishedProduct(slug: string) {
  const data = await apiFetch<{ product: unknown }>(`/api/products/${encodeURIComponent(slug)}`);
  return data.product;
}
