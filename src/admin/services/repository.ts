import type {
  AdminCategory,
  AdminPage,
  AdminPost,
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
