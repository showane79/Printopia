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

// ---------------------------------------------------------------------------
// ContentRepository — abstraction over where content lives.
// Today: the browser (localStorage). Production: the GitHub repo via the
// Cloudflare Pages Functions in /functions. The admin UI only talks to this
// interface, so swapping the backend never touches the editor.
// ---------------------------------------------------------------------------

const KEYS = {
  posts: "printopia-admin-posts",
  categories: "printopia-admin-categories",
  pages: "printopia-admin-pages",
  settings: "printopia-admin-settings",
} as const;

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write<T>(key: string, value: T) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* quota — caller shows a Persian warning */
  }
}

export interface ContentRepository {
  listPosts(): AdminPost[];
  getPost(id: string): AdminPost | undefined;
  getPostBySlug(slug: string): AdminPost | undefined;
  savePost(post: AdminPost): void;
  deletePost(id: string): void;
  listCategories(): AdminCategory[];
  saveCategories(categories: AdminCategory[]): void;
  listPages(): AdminPage[];
  getPage(key: string): AdminPage | undefined;
  savePage(page: AdminPage): void;
  getSettings(): AdminSettings;
  saveSettings(settings: AdminSettings): void;
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

export const localRepository: ContentRepository = {
  listPosts: () => read<AdminPost[]>(KEYS.posts, []),
  getPost: (id) => read<AdminPost[]>(KEYS.posts, []).find((p) => p.id === id),
  getPostBySlug: (slug) => read<AdminPost[]>(KEYS.posts, []).find((p) => p.slug === slug),
  savePost: (post) => {
    const all = read<AdminPost[]>(KEYS.posts, []);
    const idx = all.findIndex((p) => p.id === post.id);
    if (idx >= 0) all[idx] = post;
    else all.unshift(post);
    write(KEYS.posts, all);
  },
  deletePost: (id) => write(KEYS.posts, read<AdminPost[]>(KEYS.posts, []).filter((p) => p.id !== id)),
  listCategories: () => {
    const stored = read<AdminCategory[] | null>(KEYS.categories, null);
    if (stored && stored.length) return stored;
    write(KEYS.categories, defaultCategories);
    return defaultCategories;
  },
  saveCategories: (categories) => write(KEYS.categories, categories),
  listPages: () => read<AdminPage[]>(KEYS.pages, []),
  getPage: (key) => read<AdminPage[]>(KEYS.pages, []).find((p) => p.key === key),
  savePage: (page) => {
    const all = read<AdminPage[]>(KEYS.pages, []);
    const idx = all.findIndex((p) => p.key === page.key);
    if (idx >= 0) all[idx] = page;
    else all.push(page);
    write(KEYS.pages, all);
  },
  getSettings: () => ({ ...defaultSettings, ...read<Partial<AdminSettings>>(KEYS.settings, {}) }),
  saveSettings: (settings) => write(KEYS.settings, settings),
};

// ---------------------------------------------------------------------------
// Publisher — turns a save/publish action into committed content.
// localPublisher persists to the repository and is genuinely reflected on the
// public site. The production CloudflarePublisher commits to GitHub (see
// /functions) — same interface, no UI changes required.
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

export const localPublisher: Publisher = {
  async saveDraft(post) {
    const next = stamp(post, post.status === "published" ? "published" : "draft");
    localRepository.savePost(next);
    return { ok: true, message: "پیش‌نویس ذخیره شد." };
  },
  async publish(post) {
    const next = stamp(post, "published");
    if (!next.publishDate) next.publishDate = new Date().toISOString();
    localRepository.savePost(next);
    return {
      ok: true,
      message:
        "محتوا ذخیره شد و در نسخهٔ نمایشی همین مرورگر منتشر شد. برای انتشار خودکار در سایت، پنل را روی Cloudflare Pages متصل کنید.",
    };
  },
  async unpublish(post) {
    localRepository.savePost(stamp(post, "draft"));
    return { ok: true, message: "انتشار مقاله لغو شد." };
  },
  async remove(post) {
    localRepository.deletePost(post.id);
    return { ok: true, message: "مقاله حذف شد." };
  },
};

// ===========================================================================
// Extended stores (products, navigation, appearance, seo, redirects).
// Standalone, real, localStorage-backed. Seeded from the bundled catalog so
// existing content shows up immediately and is editable.
// ===========================================================================

const PKEY = "printopia-admin-products";
const NAVKEY = "printopia-admin-nav";
const APPEARANCEKEY = "printopia-admin-appearance";
const SEOKEY = "printopia-admin-seo";
const REDIRECTKEY = "printopia-admin-redirects";

export function listAdminProducts(): AdminProduct[] {
  const stored = read<AdminProduct[] | null>(PKEY, null);
  if (stored) return stored;
  const now = new Date().toISOString();
  const seeded: AdminProduct[] = bundledProducts.map((p) => ({
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
    status: "published",
    isCustom: false,
    createdAt: now,
    updatedAt: now,
  }));
  write(PKEY, seeded);
  return seeded;
}

export function getAdminProduct(id: string): AdminProduct | undefined {
  return listAdminProducts().find((p) => p.id === id);
}

export function saveAdminProduct(input: AdminProduct): AdminProduct {
  const all = listAdminProducts();
  const idx = all.findIndex((p) => p.id === input.id);
  const next: AdminProduct = { ...input, updatedAt: new Date().toISOString() };
  if (idx >= 0) all[idx] = next;
  else all.unshift(next);
  write(PKEY, all);
  return next;
}

export function deleteAdminProduct(id: string) {
  write(PKEY, listAdminProducts().filter((p) => p.id !== id));
}

export function duplicateAdminProduct(id: string): AdminProduct | undefined {
  const src = getAdminProduct(id);
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
export function listNav(): AdminNavItem[] {
  const stored = read<AdminNavItem[] | null>(NAVKEY, null);
  if (stored) return stored;
  const seeded = mainNav.map((n) => ({ label: n.label, to: n.to, visible: true }));
  write(NAVKEY, seeded);
  return seeded;
}
export function saveNav(items: AdminNavItem[]) {
  write(NAVKEY, items);
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
export function getAppearance(): AdminAppearance {
  return { ...defaultAppearance, ...read<Partial<AdminAppearance>>(APPEARANCEKEY, {}) };
}
export function saveAppearance(a: AdminAppearance) {
  write(APPEARANCEKEY, a);
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
export function getSeo(): AdminSeo {
  return { ...defaultSeo, ...read<Partial<AdminSeo>>(SEOKEY, {}) };
}
export function saveSeo(s: AdminSeo) {
  write(SEOKEY, s);
}

// Redirects -----------------------------------------------------------------
export function listRedirects(): AdminRedirect[] {
  return read<AdminRedirect[]>(REDIRECTKEY, []);
}
export function saveRedirects(items: AdminRedirect[]) {
  write(REDIRECTKEY, items);
}
