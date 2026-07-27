import { articles, type Article, type ArticleBlock } from "@/data/blog";
import type { AdminPost, Block } from "../types";
import { localRepository } from "../services/repository";

// Bridge: admin-published posts are surfaced on the public site alongside
// the bundled sample articles. Drafts/archived posts are never exposed.

function estimateReadingMinutes(text: string): number {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}

function blocksToContent(blocks: Block[]): ArticleBlock[] {
  const out: ArticleBlock[] = [];
  for (const b of blocks) {
    switch (b.type) {
      case "heading":
        if (b.text) out.push({ h: b.text });
        break;
      case "paragraph":
      case "callout":
      case "cta":
        if (b.text) out.push({ p: b.text });
        break;
      case "quote":
        if (b.text) out.push({ p: `«${b.text}»` });
        break;
      case "ordered-list":
      case "unordered-list":
        if (b.items?.length) out.push({ list: b.items });
        break;
      case "image":
        if (b.alt) out.push({ p: b.alt });
        break;
      default:
        break;
    }
  }
  return out;
}

export function adminPostToArticle(post: AdminPost): Article {
  const text = post.body
    .map((b) => b.text || (b.items || []).join(" ") || "")
    .join(" ");
  return {
    slug: post.slug,
    title: post.title,
    excerpt: post.excerpt,
    category: post.category,
    author: "تیم پرینتوپیا",
    date: post.publishDate || post.updatedAt,
    readingMinutes: estimateReadingMinutes(text),
    image: post.cover || "",
    content: blocksToContent(post.body),
  };
}

export function getPublishedArticles(): Article[] {
  const published = localRepository
    .listPosts()
    .filter((p) => p.status === "published")
    .map(adminPostToArticle);
  return [...published, ...articles];
}

export function getPublicArticle(slug: string): Article | undefined {
  return getPublishedArticles().find((a) => a.slug === slug);
}

export function generateSitemap(): string {
  const base = "https://printopia.example";
  const routes = ["/", "/shop", "/custom", "/about", "/contact", "/faq", "/blog", "/shipping", "/privacy", "/terms"];
  const urls = [
    ...routes.map((r) => `  <url><loc>${base}${r}</loc></url>`),
    ...getPublishedArticles().map((a) => `  <url><loc>${base}/blog/${a.slug}</loc></url>`),
  ].join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>`;
}
