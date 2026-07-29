// PUT    /api/admin/posts/[slug]   — update a post (commit, SHA conflict-aware)
// DELETE /api/admin/posts/[slug]   — remove a post
import { commitFile, deleteFile, json } from "../../_lib/server";

// eslint-disable-next-line
export async function onRequestPut(context: any) {
  const { slug } = context.params;
  const body = await context.request.json().catch(() => ({}));
  try {
    const result = await commitFile({
      path: `content/blog/${slug}.md`,
      content: String(body?.markdown ?? ""),
      message: `ویرایش مقاله: ${body?.title ?? slug}`,
    });
    return json({ ok: true, sha: result.commit.sha });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "خطا در ویرایش.";
    const status = msg.includes("تعارض") ? 409 : 500;
    return json({ message: msg }, status);
  }
}

// eslint-disable-next-line
export async function onRequestDelete(context: any) {
  const { slug } = context.params;
  try {
    await deleteFile({ path: `content/blog/${slug}.md`, message: `حذف مقاله: ${slug}` });
    return json({ ok: true });
  } catch {
    return json({ message: "حذف ناموفق بود." }, 500);
  }
}
