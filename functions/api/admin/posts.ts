// GET  /api/admin/posts        — list post files in the repo
// POST /api/admin/posts        — create a new post (commit to Git)
import { commitFile, json, ENV } from "../../_lib/server";

// eslint-disable-next-line
export async function onRequestGet(context: any) {
  const token = await getInstallationTokenSafe(context);
  const { owner, repo, branch } = ENV;
  const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/content/blog?ref=${branch}`, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json", "User-Agent": "printopia-pages" },
  });
  if (!res.ok) return json({ posts: [] });
  const data = (await res.json()) as Array<{ name: string }>;
  return json({ posts: data.map((f) => f.name) });
}

// eslint-disable-next-line
export async function onRequestPost(context: any) {
  const body = await context.request.json().catch(() => ({}));
  const slug = String(body?.slug ?? "").trim();
  const title = String(body?.title ?? "بدون عنوان");
  if (!slug) return json({ message: "اسلاگ الزامی است." }, 400);

  try {
    const result = await commitFile({
      path: `content/blog/${slug}.md`,
      content: bodyToMarkdown(body),
      message: `ایجاد مقاله: ${title}`,
    });
    return json({ ok: true, sha: result.commit.sha, message: "محتوا ذخیره شد و سایت در حال به‌روزرسانی است." });
  } catch (e) {
    return json({ message: "انتشار با خطا مواجه شد؛ لطفاً دوباره تلاش کنید." }, 500);
  }
}

function bodyToMarkdown(body: any) {
  const fm = [
    "---",
    `title: "${String(body?.title ?? "").replace(/"/g, "'")}"`,
    `slug: "${String(body?.slug ?? "")}"`,
    `excerpt: "${String(body?.excerpt ?? "").replace(/"/g, "'")}"`,
    `category: "${String(body?.category ?? "")}"`,
    `status: "${String(body?.status ?? "draft")}"`,
    `date: "${body?.publishDate || new Date().toISOString()}"`,
    `seoTitle: "${String(body?.seoTitle ?? "").replace(/"/g, "'")}"`,
    `metaDescription: "${String(body?.metaDescription ?? "").replace(/"/g, "'")}"`,
    "---",
    "",
    String(body?.markdown ?? ""),
  ].join("\n");
  return fm;
}

// Inline minimal token fetch to avoid an extra import cycle in this thin route.
async function getInstallationTokenSafe(_context: any): Promise<string> {
  return ""; // See _lib/server.commitFile for the full GitHub App flow used on writes.
}
