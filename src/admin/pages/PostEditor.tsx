import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useStore } from "@/context/StoreContext";
import { Field, ConfirmDialog } from "../ui";
import { BlockEditor } from "../components/BlockEditor";
import { Modal } from "@/components/Modal";
import { MediaPicker } from "../components/MediaPicker";

import { Check, Eye } from "@/components/icons";
import { cn } from "@/utils/cn";
import type { Block } from "../types";

function slugify(s: string) { return s.trim().replace(/\s+/g, "-").replace(/[؟?،,.]/g, "").slice(0, 80) || `post-${Date.now()}`; }

interface EditablePost {
  id: string; slug: string; title: string; excerpt: string; body: Block[];
  category: string; tags: string[]; cover: string; coverAlt: string;
  seoTitle: string; metaDescription: string; status: string;
}

export default function PostEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { pushToast } = useStore();
  const [loading, setLoading] = useState(!!id);
  const [post, setPost] = useState<EditablePost>({
    id: "", slug: "", title: "", excerpt: "", body: [], category: "", tags: [],
    cover: "", coverAlt: "", seoTitle: "", metaDescription: "", status: "draft",
  });
  const [slugTouched, setSlugTouched] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState(false);
  const [coverPicker, setCoverPicker] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    fetch("/api/admin/posts", { headers: { Accept: "application/json" } })
      .then((r) => r.json())
      .then((data) => {
        const found = (data.posts || []).find((p: EditablePost) => p.id === id);
        if (found && !cancelled) { setPost(found); setSlugTouched(true); }
        if (!cancelled) setLoading(false);
      })
      .catch(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [id]);

  function set<K extends keyof EditablePost>(k: K, v: EditablePost[K]) { setPost((p) => ({ ...p, [k]: v })); setDirty(true); }

  async function persist(action: "publish" | "draft") {
    if (!post.title.trim()) { pushToast("عنوان الزامی است.", "error"); return; }
    setBusy(true);
    const toSave = {
      ...post,
      slug: post.slug.trim() || slugify(post.title),
      status: action === "publish" ? "published" : post.status === "published" ? "published" : "draft",
    };
    try {
      const isEdit = !!post.id;
      const res = await fetch(isEdit ? `/api/admin/posts/${post.id}` : "/api/admin/posts", {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(toSave),
      });
      const data = await res.json();
      if (res.ok) {
        if (data.post) { setPost(data.post); if (!id && data.post.id) navigate(`/admin/posts/${data.post.id}`, { replace: true }); }
        pushToast(action === "publish" ? "منتشر شد و در سایت نمایش داده می‌شود." : "ذخیره شد.");
        setDirty(false);
      } else { pushToast(data.message || "خطا در ذخیره.", "error"); }
    } catch { pushToast("اتصال ناموفق بود.", "error"); }
    setBusy(false);
  }

  async function doDelete() {
    setConfirmDelete(false);
    const res = await fetch(`/api/admin/posts/${post.id}`, { method: "DELETE", headers: { "Content-Type": "application/json" } });
    if (res.ok) { pushToast("پست حذف شد و از سایت برداشته شد.", "info"); navigate("/admin/posts"); }
    else pushToast("حذف ناموفق بود.", "error");
  }

  const hints = useMemo(() => {
    const list: { ok: boolean; msg: string }[] = [];
    list.push({ ok: post.title.length >= 10 && post.title.length <= 60, msg: `عنوان: ${post.title.length} نویسه` });
    list.push({ ok: !!post.slug.trim(), msg: post.slug.trim() ? "اسلاگ تنظیم شده" : "اسلاگ خالی" });
    const md = post.metaDescription.trim();
    list.push({ ok: md.length >= 70 && md.length <= 160, msg: `متا: ${md.length} نویسه` });
    list.push({ ok: !!post.excerpt.trim(), msg: post.excerpt.trim() ? "خلاصه دارد" : "خلاصه خالی" });
    const hasH2 = post.body.some((b) => b.type === "heading" && b.level === 2);
    list.push({ ok: hasH2, msg: hasH2 ? "تیتر H2 دارد" : "تیتر H2 اضافه کنید" });
    return list;
  }, [post]);

  if (loading)
    return <div className="grid min-h-screen place-items-center text-muted"><span className="h-7 w-7 animate-spin rounded-full border-2 border-accent border-t-transparent" /></div>;

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <Link to="/admin/posts" className="btn btn-ghost text-sm">بازگشت به پست‌ها</Link>
        {dirty && <span className="chip border-warning/30 bg-warning/12 text-warning">ذخیره نشده</span>}
        <span className={cn("chip", post.status === "published" ? "border-success/30 bg-success/12 text-success" : "border-line bg-surface2/60 text-muted")}>{post.status === "published" ? "منتشرشده" : "پیش‌نویس"}</span>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="flex flex-col gap-5">
          <Field label="عنوان" htmlFor="title">
            <input id="title" className="input text-lg" value={post.title} onChange={(e) => { const v = e.target.value; setPost((p) => ({ ...p, title: v, slug: slugTouched ? p.slug : slugify(v) })); setDirty(true); }} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="اسلاگ" htmlFor="slug"><input id="slug" dir="ltr" className="input text-start" value={post.slug} onChange={(e) => { setSlugTouched(true); set("slug", e.target.value); }} placeholder="slug" /></Field>
            <Field label="دسته‌بندی" htmlFor="cat"><input id="cat" className="input" value={post.category} onChange={(e) => set("category", e.target.value)} placeholder="مثلاً راهنمای خرید" /></Field>
          </div>
          <Field label="خلاصهٔ کوتاه" htmlFor="excerpt"><textarea id="excerpt" className="input min-h-20 resize-y" value={post.excerpt} onChange={(e) => set("excerpt", e.target.value)} /></Field>
          <Field label="تصویر شاخص" htmlFor="cover">
            <div className="flex items-center gap-3">
              {post.cover ? <img src={post.cover} alt={post.coverAlt} className="h-20 w-28 rounded-xl object-cover" /> : <div className="grid h-20 w-28 place-items-center rounded-xl border border-dashed border-line text-xs text-muted">بدون تصویر</div>}
              <div className="flex flex-col gap-2">
                <button type="button" onClick={() => setCoverPicker(true)} className="btn btn-secondary text-sm">از رسانه‌ها</button>
                {post.cover && <button type="button" onClick={() => set("cover", "")} className="text-xs text-danger">حذف</button>}
              </div>
            </div>
          </Field>
          <Field label="متن جایگزین تصویر" htmlFor="calt"><input id="calt" className="input" value={post.coverAlt} onChange={(e) => set("coverAlt", e.target.value)} /></Field>
          <Field label="برچسب‌ها (با کاما)" htmlFor="tags"><input id="tags" className="input" value={post.tags.join("، ")} onChange={(e) => set("tags", e.target.value.split(/[،,]/).map((s) => s.trim()).filter(Boolean))} /></Field>
          <div>
            <p className="mb-2 text-sm font-bold">متن مقاله</p>
            <BlockEditor value={post.body} onChange={(body: Block[]) => set("body", body)} />
          </div>
        </div>

        <aside className="flex flex-col gap-5 lg:sticky lg:top-24 lg:self-start">
          <div className="card p-4">
            <p className="mb-3 text-sm font-bold">ذخیره و انتشار</p>
            <div className="flex flex-col gap-2">
              <button type="button" disabled={busy} onClick={() => persist("publish")} className="btn btn-primary w-full">{busy ? "در حال ذخیره..." : "انتشار"}</button>
              <div className="flex gap-2">
                <button type="button" disabled={busy} onClick={() => persist("draft")} className="btn btn-secondary flex-1 text-sm">ذخیره پیش‌نویس</button>
                <button type="button" onClick={() => setPreview(true)} className="btn btn-secondary px-3" aria-label="پیش‌نمایش"><Eye className="h-5 w-5" /></button>
              </div>
              {id && <button type="button" onClick={() => setConfirmDelete(true)} className="btn btn-ghost w-full text-sm text-danger">حذف پست</button>}
            </div>
          </div>
          <div className="card p-4">
            <p className="mb-3 text-sm font-bold">راهنمای سئو</p>
            <ul className="flex flex-col gap-2 text-xs">
              {hints.map((h, i) => (
                <li key={i} className="flex items-start gap-2"><Check className={cn("mt-0.5 h-4 w-4 shrink-0", h.ok ? "text-success" : "text-muted")} /><span className={h.ok ? "text-muted" : "text-warning"}>{h.msg}</span></li>
              ))}
            </ul>
            <div className="mt-4 flex flex-col gap-3 border-t border-line pt-4">
              <Field label="عنوان سئو" htmlFor="st"><input id="st" className="input" value={post.seoTitle} onChange={(e) => set("seoTitle", e.target.value)} /></Field>
              <Field label="توضیحات متا" htmlFor="md"><textarea id="md" className="input min-h-16 resize-y" value={post.metaDescription} onChange={(e) => set("metaDescription", e.target.value)} /></Field>
            </div>
          </div>
        </aside>
      </div>

      {/* preview */}
      <Modal open={preview} onClose={() => setPreview(false)} title="پیش‌نمایش" size="lg">
        <article className="max-h-[78vh] overflow-auto p-6">
          <h1 className="text-2xl font-extrabold">{post.title || "بدون عنوان"}</h1>
          <p className="mt-2 text-muted">{post.excerpt}</p>
          {post.cover && <img src={post.cover} alt={post.coverAlt} className="mt-4 aspect-video w-full rounded-xl object-cover" />}
          <div className="mt-5 flex flex-col gap-3">{post.body.map((b, i) => <BlockPreview key={i} block={b} />)}</div>
        </article>
      </Modal>
      {/* cover picker — loads the shared server library */}
      <MediaPicker
        open={coverPicker}
        onClose={() => setCoverPicker(false)}
        onSelect={(url, alt) => { set("cover", url); set("coverAlt", alt); }}
      />

      <ConfirmDialog open={confirmDelete} title="حذف پست" message={`آیا «${post.title || "این پست"}» حذف شود؟ از سایت برداشته می‌شود.`} confirmText="حذف" danger onConfirm={doDelete} onCancel={() => setConfirmDelete(false)} />
    </div>
  );
}

function BlockPreview({ block }: { block: Block }) {
  switch (block.type) {
    case "heading": return block.level === 3 ? <h3 className="text-lg font-bold">{block.text}</h3> : <h2 className="text-xl font-extrabold">{block.text}</h2>;
    case "paragraph": return <p className="leading-8 text-muted">{block.text}</p>;
    case "quote": return <blockquote className="border-s-2 border-accent ps-4 italic text-muted">«{block.text}»</blockquote>;
    case "callout": return <div className="rounded-xl border border-accent2/30 bg-accent2/5 p-4 leading-8">{block.text}</div>;
    case "cta": return <div className="rounded-xl bg-accent/10 p-4 text-center font-bold">{block.text}</div>;
    case "ordered-list": return <ol className="list-decimal pe-6 leading-8 text-muted">{(block.items ?? []).map((it, i) => <li key={i}>{it}</li>)}</ol>;
    case "unordered-list": return <ul className="list-disc pe-6 leading-8 text-muted">{(block.items ?? []).map((it, i) => <li key={i}>{it}</li>)}</ul>;
    case "image": return block.src ? <img src={block.src} alt={block.alt || ""} className="rounded-xl" /> : null;
    case "faq": return <div className="flex flex-col gap-2">{(block.faqs ?? []).map((f, i) => <div key={i} className="rounded-lg border border-line p-3"><p className="font-bold">{f.q}</p><p className="text-sm text-muted">{f.a}</p></div>)}</div>;
    default: return null;
  }
}
