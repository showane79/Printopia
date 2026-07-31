/**
 * Public article feed — reads from the server API (D1).
 *
 * Source of truth: /api/posts (published posts only).
 * The bundled sample articles in @/data/blog are a DEV-ONLY fallback for when
 * the API is unreachable (`npm run dev` without a Worker). In production on
 * Cloudflare, D1 is the single source of truth.
 */

import { useEffect, useMemo, useState } from "react";
import { articles as bundled, type Article, type ArticleBlock } from "@/data/blog";
import type { AdminPost, Block } from "../types";
import { apiListPublishedPosts } from "../services/api";

function estimateReadingMinutes(text: string): number {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}

/** Editor blocks → the simplified renderer shape used by public pages. */
export function blocksToContent(blocks: Block[]): ArticleBlock[] {
  const out: ArticleBlock[] = [];
  for (const b of blocks ?? []) {
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
  const text = (post.body ?? []).map((b) => b.text || (b.items || []).join(" ") || "").join(" ");
  return {
    slug: post.slug,
    title: post.title,
    excerpt: post.excerpt,
    category: post.category,
    author: "تیم پرینتوپیا",
    date: post.publishDate || post.updatedAt,
    readingMinutes: estimateReadingMinutes(text),
    image: post.cover || "",
    content: blocksToContent(post.body ?? []),
  };
}

/** Module-level cache shared across components for one page load. */
let cache: Article[] | null = null;
let inflight: Promise<Article[]> | null = null;

export async function fetchArticles(force = false): Promise<Article[]> {
  if (cache && !force) return cache;
  if (inflight && !force) return inflight;
  inflight = (async () => {
    try {
      const rows = await apiListPublishedPosts();
      cache = rows.map((r) => ({
        slug: r.slug,
        title: r.title,
        excerpt: r.excerpt,
        category: r.category,
        author: r.author,
        date: r.date,
        readingMinutes: r.readingMinutes,
        image: r.image,
        // The API returns raw editor blocks; convert for the public renderer.
        content: blocksToContent(r.content as Block[]),
      }));
    } catch {
      cache = bundled;
    }
    inflight = null;
    return cache;
  })();
  return inflight;
}

/** Invalidate after an admin mutation so the blog reflects changes. */
export function invalidateArticles() {
  cache = null;
  inflight = null;
}

export interface ArticlesState {
  articles: Article[];
  loading: boolean;
}

export function useArticles(): ArticlesState {
  const [articles, setArticles] = useState<Article[]>(() => cache ?? []);
  const [loading, setLoading] = useState(cache === null);

  useEffect(() => {
    if (cache) {
      setArticles(cache);
      setLoading(false);
      return;
    }
    let alive = true;
    setLoading(true);
    fetchArticles().then((list) => {
      if (!alive) return;
      setArticles(list);
      setLoading(false);
    });
    return () => {
      alive = false;
    };
  }, []);

  return { articles, loading };
}

export function useArticle(slug: string | undefined) {
  const { articles, loading } = useArticles();
  const article = useMemo(
    () => (slug ? articles.find((a) => a.slug === slug) : undefined),
    [articles, slug]
  );
  return { article, loading };
}

export async function generateSitemap(): Promise<string> {
  const base = "https://printopia.example";
  const routes = ["/", "/shop", "/custom", "/about", "/contact", "/faq", "/blog", "/shipping", "/privacy", "/terms"];
  const list = await fetchArticles();
  const urls = [
    ...routes.map((r) => `  <url><loc>${base}${r}</loc></url>`),
    ...list.map((a) => `  <url><loc>${base}/blog/${a.slug}</loc></url>`),
  ].join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>`;
}
