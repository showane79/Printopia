// Content model for the Printopia admin panel.
// Kept framework-agnostic so it can be served by localStorage today
// and by Cloudflare Pages Functions (Git publishing) tomorrow.

export type PostStatus = "draft" | "published" | "archived";

export type BlockType =
  | "heading"
  | "paragraph"
  | "ordered-list"
  | "unordered-list"
  | "quote"
  | "callout"
  | "image"
  | "cta"
  | "faq";

export interface FaqPair {
  q: string;
  a: string;
}

export interface Block {
  id: string;
  type: BlockType;
  text?: string;
  level?: 2 | 3;
  items?: string[];
  src?: string;
  alt?: string;
  faqs?: FaqPair[];
}

export interface AdminPost {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  cover?: string;
  coverAlt?: string;
  category: string;
  tags: string[];
  body: Block[];
  seoTitle?: string;
  metaDescription?: string;
  ogImage?: string;
  canonical?: string;
  publishDate?: string;
  status: PostStatus;
  faqs: FaqPair[];
  relatedProductSlugs: string[];
  relatedPostSlugs: string[];
  createdAt: string;
  updatedAt: string;
}

export interface AdminCategory {
  id: string;
  name: string;
  slug: string;
  blurb?: string;
}

export interface AdminPage {
  id: string;
  key: string; // about | contact | terms | privacy | shipping | faq
  title: string;
  intro?: string;
  body: Block[];
  status: PostStatus;
  updatedAt: string;
}

export interface AdminMedia {
  id: string;
  name: string;
  url: string; // data URL in the local version; remote URL in production
  alt: string;
  size: number;
  width?: number;
  height?: number;
  createdAt: string;
}

export interface AdminSettings {
  siteName: string;
  tagline: string;
  freeShippingThreshold: number;
  phone: string;
  email: string;
}

export type ProductStatus = "published" | "draft";

/** Editable overlay for a product (real catalog data is the source of truth). */
export interface AdminProduct {
  id: string;
  slug: string;
  title: string;
  subtitle: string;
  category: string;
  price: number;
  oldPrice?: number;
  image?: string;
  imageAlt?: string;
  material: string;
  customizable: boolean;
  inStock: boolean;
  featured: boolean;
  badge?: string;
  productionDays: number;
  shortDesc: string;
  description: string;
  status: ProductStatus;
  isCustom: boolean; // true when created in admin (no bundled base)
  createdAt: string;
  updatedAt: string;
}

export interface AdminNavItem {
  label: string;
  to: string;
  visible: boolean;
}

export interface AdminAppearance {
  storeName: string;
  accent: string;
  accent2: string;
  defaultTheme: "dark" | "light";
  ogImage?: string;
  social: { instagram: string; telegram: string; whatsapp: string };
}

export interface AdminSeo {
  defaultTitle: string;
  defaultDescription: string;
  ogImage: string;
  canonicalBase: string;
  robotsIndex: boolean;
  sitemapEnabled: boolean;
}

export interface AdminRedirect {
  id: string;
  source: string;
  destination: string;
  type: 301 | 302;
  enabled: boolean;
}
