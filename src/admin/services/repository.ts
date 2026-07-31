/**
 * Server-backed content repository.
 * All CMS-managed content now persists in D1 through the API.
 */

import { products as bundledProducts } from "@/data/products";
import { mainNav } from "@/data/site";
import type {
  AdminAppearance,
  AdminCategory,
  AdminNavItem,
  AdminPage,
  AdminPost,
  AdminProduct,
  AdminRedirect,
  AdminSeo,
  AdminSettings,
  PostStatus,
} from "../types";
import {
  apiListPosts,
  apiCreatePost,
  apiUpdatePost,
  apiDeletePost,
  apiListProducts,
  apiCreateProduct,
  apiUpdateProduct,
  apiDeleteProduct,
  apiGetConfig,
  apiSetConfig,
} from "./api";

// ---------------------------------------------------------------------------
// ContentRepository — server-backed content storage.
// ---------------------------------------------------------------------------

export interface ContentRepository {
  listPosts(): Promise<AdminPost[]>;
  getPost(id: string): Promise<AdminPost | undefined>;
  getPostBySlug(slug: string): Promise<AdminPost | undefined>;
  savePost(post: AdminPost): Promise<AdminPost>;
  deletePost(id: string): Promise<void>;
  listCategories(): Promise<AdminCategory[]>;
  saveCategories(categories: AdminCategory[]): Promise<void>;
  listPages(): Promise<AdminPage[]>;
  getPage(key: string): Promise<AdminPage | undefined>;
  savePage(page: AdminPage): Promise<void>;
  getSettings(): Promise<AdminSettings>;
  saveSettings(settings: AdminSettings): Promise<void>;
}

const defaultCategories: AdminCategory[] = [
  { id: "guide", slug: "guide", name: "راهنمای خرید" },
  { id: "material", slug: "material", name: "متریال" },
  { id: "tutorial", slug: "tutorial", name: "آموزش" },
  { id: "news", slug: "news", name: "اخبار" },
];

const defaultSettings: AdminSettings = {
  siteName: "پرینتوپیا",
  tagline: "ایده‌ها را به واقعیت سه‌بعدی تبدیل می‌کنیم",
  freeShippingThreshold: 500_000,
  phone: "۰۲۱-۹۱۰۰۲۰۳۰",
  email: "hello@printopia.example",
};

export const serverRepository: ContentRepository = {
  async listPosts() {
    return apiListPosts();
  },
  async getPost(id) {
    const all = await apiListPosts();
    return all.find((p) => p.id === id);
  },
  async getPostBySlug(slug) {
    const all = await apiListPosts();
    return all.find((p) => p.slug === slug);
  },
  async savePost(post) {
    // Decide create vs update by asking the server, since a locally built
    // draft always carries an id and createdAt.
    const all = await apiListPosts().catch(() => [] as AdminPost[]);
    const onServer = post.id ? all.some((p) => p.id === post.id) : false;
    return onServer ? apiUpdatePost(post.id, post) : apiCreatePost(post);
  },
  async deletePost(id) {
    return apiDeletePost(id);
  },
  async listCategories() {
    const stored = await apiGetConfig<AdminCategory[] | null>("categories");
    if (stored && stored.length) return stored;
    await apiSetConfig("categories", defaultCategories);
    return defaultCategories;
  },
  async saveCategories(categories) {
    return apiSetConfig("categories", categories);
  },
  async listPages() {
    return (await apiGetConfig<AdminPage[]>("homepage")) || [];
  },
  async getPage(key) {
    const all = await this.listPages();
    return all.find((p) => p.key === key);
  },
  async savePage(page) {
    const all = await this.listPages();
    const idx = all.findIndex((p) => p.key === page.key);
    if (idx >= 0) all[idx] = page;
    else all.push(page);
    return apiSetConfig("homepage", all);
  },
  async getSettings() {
    const stored = await apiGetConfig<Partial<AdminSettings>>("site_settings");
    return { ...defaultSettings, ...stored };
  },
  async saveSettings(settings) {
    return apiSetConfig("site_settings", settings);
  },
};

// ---------------------------------------------------------------------------
// Publisher — server-backed publish actions.
// ---------------------------------------------------------------------------

export interface PublishResult {
  ok: boolean;
  message: string;
  sha?: string;
}

export interface Publisher {
  saveDraft(post: AdminPost): Promise<PublishResult>;
  publish(post: AdminPost): Promise<PublishResult>;
  unpublish(post: AdminPost): Promise<PublishResult>;
  remove(post: AdminPost): Promise<PublishResult>;
}

function stamp(post: AdminPost, status: PostStatus): AdminPost {
  return { ...post, status, updatedAt: new Date().toISOString() };
}

export const serverPublisher: Publisher = {
  async saveDraft(post) {
    const next = stamp(post, post.status === "published" ? "published" : "draft");
    await serverRepository.savePost(next);
    return { ok: true, message: "پیش‌نویس ذخیره شد." };
  },
  async publish(post) {
    const next = stamp(post, "published");
    if (!next.publishDate) next.publishDate = new Date().toISOString();
    await serverRepository.savePost(next);
    return { ok: true, message: "مقاله منتشر شد و در سایت نمایش داده می‌شود." };
  },
  async unpublish(post) {
    await serverRepository.savePost(stamp(post, "draft"));
    return { ok: true, message: "انتشار مقاله لغو شد." };
  },
  async remove(post) {
    await serverRepository.deletePost(post.id);
    return { ok: true, message: "مقاله حذف شد." };
  },
};

// ===========================================================================
// Products — server-backed.
// ===========================================================================

export async function listAdminProducts(): Promise<AdminProduct[]> {
  try {
    return await apiListProducts();
  } catch {
    // Fallback to seeded bundled products on first load before any are saved
    const now = new Date().toISOString();
    return bundledProducts.map((p) => ({
      id: p.id,
      slug: p.slug,
      title: p.title,
      subtitle: p.subtitle,
      category: p.category,
      price: p.price,
      oldPrice: p.oldPrice,
      image: p.image,
      imageAlt: p.title,
      material: String(p.material),
      customizable: p.customizable,
      inStock: p.inStock,
      featured: p.featured,
      badge: p.badge,
      productionDays: p.productionDays,
      shortDesc: p.shortDesc,
      description: p.description,
      status: "published" as const,
      isCustom: false,
      createdAt: now,
      updatedAt: now,
    }));
  }
}

export async function getAdminProduct(id: string): Promise<AdminProduct | undefined> {
  const all = await listAdminProducts();
  return all.find((p) => p.id === id);
}

export async function saveAdminProduct(input: AdminProduct): Promise<AdminProduct> {
  const next: AdminProduct = { ...input, updatedAt: new Date().toISOString() };
  // Ask the server whether this id already exists so bundled-seed products
  // and brand-new drafts both persist correctly.
  const all = await apiListProducts().catch(() => [] as AdminProduct[]);
  const onServer = next.id ? all.some((p) => p.id === next.id) : false;
  return onServer ? apiUpdateProduct(next.id, next) : apiCreateProduct(next);
}

export async function deleteAdminProduct(id: string): Promise<void> {
  return apiDeleteProduct(id);
}

export async function duplicateAdminProduct(id: string): Promise<AdminProduct | undefined> {
  const src = await getAdminProduct(id);
  if (!src) return undefined;
  const now = new Date().toISOString();
  const copy: AdminProduct = {
    ...src,
    id: `p_${Date.now().toString(36)}`,
    slug: `${src.slug}-copy`,
    title: `${src.title} (کپی)`,
    status: "draft",
    isCustom: true,
    createdAt: now,
    updatedAt: now,
  };
  return saveAdminProduct(copy);
}

// Navigation ---------------------------------------------------------------
export async function listNav(): Promise<AdminNavItem[]> {
  const stored = await apiGetConfig<AdminNavItem[] | null>("navigation");
  if (stored) return stored;
  const seeded = mainNav.map((n) => ({ label: n.label, to: n.to, visible: true }));
  await apiSetConfig("navigation", seeded);
  return seeded;
}

export async function saveNav(items: AdminNavItem[]): Promise<void> {
  return apiSetConfig("navigation", items);
}

// Appearance ----------------------------------------------------------------
const defaultAppearance: AdminAppearance = {
  storeName: "پرینتوپیا",
  accent: "#8b5cf6",
  accent2: "#22d3ee",
  defaultTheme: "dark",
  ogImage: "",
  social: { instagram: "https://instagram.com/", telegram: "https://telegram.org/", whatsapp: "989120000000" },
};

export async function getAppearance(): Promise<AdminAppearance> {
  const stored = await apiGetConfig<Partial<AdminAppearance>>("appearance");
  return { ...defaultAppearance, ...stored };
}

export async function saveAppearance(a: AdminAppearance): Promise<void> {
  return apiSetConfig("appearance", a);
}

// SEO -----------------------------------------------------------------------
const defaultSeo: AdminSeo = {
  defaultTitle: "پرینتوپیا | چاپ سه‌بعدی پریمیوم",
  defaultDescription: "فروشگاه آنلاین محصولات چاپ سه‌بعدی و هدیه‌های شخصی‌سازی‌شده.",
  ogImage: "",
  canonicalBase: "https://printopia.example",
  robotsIndex: true,
  sitemapEnabled: true,
};

export async function getSeo(): Promise<AdminSeo> {
  const stored = await apiGetConfig<Partial<AdminSeo>>("seo");
  return { ...defaultSeo, ...stored };
}

export async function saveSeo(s: AdminSeo): Promise<void> {
  return apiSetConfig("seo", s);
}

// Redirects -----------------------------------------------------------------
export async function listRedirects(): Promise<AdminRedirect[]> {
  return (await apiGetConfig<AdminRedirect[]>("redirects")) || [];
}

export async function saveRedirects(items: AdminRedirect[]): Promise<void> {
  return apiSetConfig("redirects", items);
}
