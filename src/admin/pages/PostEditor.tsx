import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { localRepository, localPublisher } from "../services/repository";
import { localMedia } from "../services/media";
import { useStore } from "@/context/StoreContext";
import { Field, ConfirmDialog, StatusPill } from "../ui";
import { BlockEditor } from "../components/BlockEditor";
import { Modal } from "@/components/Modal";
import { Check, Close, Eye } from "@/components/icons";
import { products } from "@/data/products";
import { getPublishedArticles } from "../lib/publicContent";
import type { AdminPost, Block, FaqPair } from "../types";
import { cn } from "@/utils/cn";

function sanitizeSlug(s: string) {
  return s.trim().replace(/\s+/g, "-").replace(/[؟?،,.]/g, "").slice(0, 80);
}

export default function PostEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { pushToast } = useStore();
  const categories = localRepository.listCategories();

  const existing = id ? localRepository.getPost(id) : undefined;

  const [post, setPost] = useState<AdminPost>(() => {
    if (existing) return existing;
    const now = new Date().toISOString();
    return {
      id: `p_${Date.now().toString(36)}`,
      slug: "",
      title: "",
      excerpt: "",
      category: categories[0]?.id ?? "guide",
      tags: [],
      body: [],
      faqs: [],
      relatedProductSlugs: [],
      relatedPostSlugs: [],
      status: "draft",
      createdAt: now,
      updatedAt: now,
    };
  });

  const [slugTouched, setSlugTouched] = useState(!!existing?.slug);
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState(false);
  const [coverPicker, setCoverPicker] = useState(false);
  const [confirmBack, setConfirmBack] = useState(false);
  const draftKey = `printopia-draft-${post.id}`;
  const didRestore = useRef(false);

  // Draft autosave (safety net only — never writes to the published store).
  useEffect(() => {
    const t = window.setTimeout(() => {
      try {
        localStorage.setItem(draftKey, JSON.stringify({ post, savedAt: Date.now() }));
      } catch {
        /* ignore */
      }
    }, 1200);
    return () => window.clearTimeout(t);
  }, [post, draftKey]);

  // Restore unsaved local draft on first load.
  useEffect(() => {
    if (didRestore.current) return;
    didRestore.current = true;
    try {
      const raw = localStorage.getItem(draftKey);
      if (raw) {
        const data = JSON.parse(raw) as { post: AdminPost };
        setPost(data.post);
        pushToast("پیش‌نویس ذخیره‌شدهٔ مرورگر بازیابی شد.", "info");
      }
    } catch {
      /* ignore */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function set<K extends keyof AdminPost>(key: K, value: AdminPost[K]) {
    setPost((p) => ({ ...p, [key]: value }));
    setDirty(true);
  }
  function setTitle(value: string) {
    setPost((p) => ({ ...p, title: value, slug: slugTouched ? p.slug : sanitizeSlug(value) }));
    setDirty(true);
  }
  function clearDraft() {
    try {
      localStorage.removeItem(draftKey);
    } catch {
      /* ignore */
    }
    pushToast("پیش‌نویس مرورگر پاک شد.", "info");
  }

  async function persist(statusAction: "draft" | "publish" | "unpublish") {
    if (!post.title.trim()) {
      pushToast("عنوان مقاله الزامی است.", "error");
      return;
    }
    const toSave: AdminPost = {
      ...post,
      slug: post.slug.trim() || sanitizeSlug(post.title) || `post-${Date.now()}`,
    };
    setBusy(true);
    let result;
    if (statusAction === "publish") result = await localPublisher.publish(toSave);
    else if (statusAction === "unpublish") result = await localPublisher.unpublish(toSave);
    else result = await localPublisher.saveDraft(toSave);
    setBusy(false);
    pushToast(result.message, result.ok ? "success" : "error");
    if (result.ok) {
      try {
        localStorage.removeItem(draftKey);
      } catch {
        /* ignore */
      }
      setDirty(false);
    }
  }

  function handleBack() {
    if (dirty) setConfirmBack(true);
    else navigate("/admin/posts");
  }

  // SEO + structure hints
  const hints = useMemo(() => {
    const list: { ok: boolean; msg: string }[] = [];
    const t = post.title.trim();
    list.push({ ok: t.length >= 10 && t.length <= 60, msg: `عنوان: ${t.length} نویسه (ایده‌آل ۱۰ تا ۶۰)` });
    list.push({ ok: !!post.slug.trim(), msg: post.slug.trim() ? "اسلاگ تنظیم شده" : "اسلاگ خالی است" });
    const md = (post.metaDescription ?? "").trim();
    list.push({ ok: md.length >= 70 && md.length <= 160, msg: `توضیحات متا: ${md.length} نویسه (۷۰ تا ۱۶۰)` });
    list.push({ ok: !post.cover || !!post.coverAlt?.trim(), msg: post.cover ? (post.coverAlt?.trim() ? "متن جایگزین تصویر ثبت شده" : "متن جایگزین تصویر خالی است") : "تصویر شاخص اختیاری" });
    const hasH2 = post.body.some((b) => b.type === "heading" && b.level === 2);
    list.push({ ok: hasH2, msg: hasH2 ? "حداقل یک تیتر ۲ وجود دارد" : "یک تیتر ۲ (H2) اضافه کنید" });
    return list;
  }, [post]);

  const toc = useMemo(
    () => post.body.filter((b) => b.type === "heading" && b.text?.trim()).map((b) => ({ level: b.level ?? 2, text: b.text!.trim() })),
    [post]
  );

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <button type="button" onClick={handleBack} className="btn btn-ghost text-sm">
          بازگشت به مقاله‌ها
        </button>
        <div className="flex items-center gap-2">
          <StatusPill status={post.status} />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        {/* MAIN */}
        <div className="flex flex-col gap-5">
          <Field label="عنوان مقاله" htmlFor="title">
            <input id="title" className="input text-lg" value={post.title} onChange={(e) => setTitle(e.target.value)} placeholder="عنوان جذاب و دقیق" />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="اسلاگ (آدرس URL)" htmlFor="slug" hint="بخش آدرس مقاله در سایت">
              <input id="slug" className="input" dir="ltr" value={post.slug} onChange={(e) => { setSlugTouched(true); set("slug", e.target.value); }} placeholder="article-slug" />
            </Field>
            <Field label="دسته‌بندی" htmlFor="cat">
              <select id="cat" className="input" value={post.category} onChange={(e) => set("category", e.target.value)}>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </Field>
          </div>

          <Field label="خلاصهٔ کوتاه" htmlFor="excerpt">
            <textarea id="excerpt" className="input min-h-20 resize-y" value={post.excerpt} onChange={(e) => set("excerpt", e.target.value)} placeholder="یک یا دو جمله برای معرفی مقاله" />
          </Field>

          {/* cover */}
          <Field label="تصویر شاخص" htmlFor="cover" error={undefined}>
            <div className="flex items-center gap-3">
              {post.cover ? (
                <img src={post.cover} alt={post.coverAlt || ""} className="h-20 w-28 rounded-xl object-cover" />
              ) : (
                <div className="grid h-20 w-28 place-items-center rounded-xl border border-dashed border-line text-xs text-muted">بدون تصویر</div>
              )}
              <div className="flex flex-col gap-2">
                <button type="button" onClick={() => setCoverPicker(true)} className="btn btn-secondary text-sm">انتخاب از رسانه‌ها</button>
                {post.cover && (
                  <button type="button" onClick={() => set("cover", undefined)} className="text-xs text-danger">حذف تصویر</button>
                )}
              </div>
            </div>
          </Field>
          <Field label="متن جایگزین تصویر شاخص" htmlFor="coverAlt">
            <input id="coverAlt" className="input" value={post.coverAlt ?? ""} onChange={(e) => set("coverAlt", e.target.value)} placeholder="توضیح تصویر برای دسترس‌پذیری و سئو" />
          </Field>

          <Field label="برچسب‌ها" htmlFor="tags" hint="با کاما جدا کنید">
            <input id="tags" className="input" value={post.tags.join("، ")} onChange={(e) => set("tags", e.target.value.split(/[،,]/).map((s) => s.trim()).filter(Boolean))} placeholder="چاپ سه‌بعدی، راهنما" />
          </Field>

          {/* body */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <p className="text-sm font-bold">متن مقاله</p>
              {toc.length > 0 && <span className="text-xs text-muted">{toFa(toc.length)} تیتر برای فهرست مطالب</span>}
            </div>
            <BlockEditor value={post.body} onChange={(body: Block[]) => set("body", body)} />
          </div>

          {/* faqs */}
          <div>
            <p className="mb-2 text-sm font-bold">سؤالات متداول (برای سئو و جستجوی هوشمند)</p>
            <div className="flex flex-col gap-3">
              {post.faqs.map((f: FaqPair, idx) => (
                <div key={idx} className="rounded-xl border border-line p-3">
                  <div className="mb-2 flex justify-end">
                    <button type="button" onClick={() => set("faqs", post.faqs.filter((_, j) => j !== idx))} aria-label="حذف سؤال" className="text-danger">
                      <Close className="h-4 w-4" />
                    </button>
                  </div>
                  <input className="input mb-2" placeholder="سؤال" value={f.q} onChange={(e) => { const faqs = [...post.faqs]; faqs[idx] = { ...f, q: e.target.value }; set("faqs", faqs); }} />
                  <textarea className="input min-h-16 resize-y" placeholder="پاسخ" value={f.a} onChange={(e) => { const faqs = [...post.faqs]; faqs[idx] = { ...f, a: e.target.value }; set("faqs", faqs); }} />
                </div>
              ))}
              <button type="button" onClick={() => set("faqs", [...post.faqs, { q: "", a: "" }])} className="btn btn-ghost self-start text-sm text-accent">افزودن سؤال</button>
            </div>
          </div>
        </div>

        {/* SIDEBAR */}
        <aside className="flex flex-col gap-5 lg:sticky lg:top-24 lg:self-start">
          <div className="card p-4">
            <p className="mb-3 text-sm font-bold">انتشار</p>
            <div className="flex flex-col gap-2">
              <button type="button" disabled={busy} onClick={() => persist("publish")} className="btn btn-primary w-full">
                {busy ? "در حال ذخیره..." : "انتشار"}
              </button>
              <div className="flex gap-2">
                <button type="button" disabled={busy} onClick={() => persist("draft")} className="btn btn-secondary flex-1 text-sm">ذخیره پیش‌نویس</button>
                <button type="button" onClick={() => setPreview(true)} className="btn btn-secondary px-3" aria-label="پیش‌نمایش">
                  <Eye className="h-5 w-5" />
                </button>
              </div>
              {post.status === "published" && (
                <button type="button" disabled={busy} onClick={() => persist("unpublish")} className="btn btn-ghost text-sm text-muted">لغو انتشار</button>
              )}
            </div>
            <button type="button" onClick={clearDraft} className="mt-3 text-xs text-muted hover:text-danger">پاک‌سازی پیش‌نویس مرورگر</button>
          </div>

          {/* SEO */}
          <div className="card p-4">
            <p className="mb-3 text-sm font-bold">راهنمای سئو</p>
            <ul className="flex flex-col gap-2 text-xs">
              {hints.map((h, i) => (
                <li key={i} className="flex items-start gap-2">
                  <Check className={cn("mt-0.5 h-4 w-4 shrink-0", h.ok ? "text-success" : "text-muted")} />
                  <span className={h.ok ? "text-muted" : "text-warning"}>{h.msg}</span>
                </li>
              ))}
            </ul>
            <div className="mt-4 flex flex-col gap-3 border-t border-line pt-4">
              <Field label="عنوان سئو" htmlFor="seoTitle">
                <input id="seoTitle" className="input" value={post.seoTitle ?? ""} onChange={(e) => set("seoTitle", e.target.value)} placeholder="عنوان پیش‌فرض = عنوان مقاله" />
              </Field>
              <Field label="توضیحات متا" htmlFor="meta">
                <textarea id="meta" className="input min-h-16 resize-y" value={post.metaDescription ?? ""} onChange={(e) => set("metaDescription", e.target.value)} />
              </Field>
              <Field label="تصویر Open Graph" htmlFor="og">
                <input id="og" className="input" dir="ltr" value={post.ogImage ?? ""} onChange={(e) => set("ogImage", e.target.value)} placeholder="URL تصویر شبکه‌های اجتماعی" />
              </Field>
              <Field label="canonical URL" htmlFor="canon">
                <input id="canon" className="input" dir="ltr" value={post.canonical ?? ""} onChange={(e) => set("canonical", e.target.value)} placeholder="اختیاری" />
              </Field>
            </div>
          </div>

          {/* TOC */}
          {toc.length > 0 && (
            <div className="card p-4">
              <p className="mb-3 text-sm font-bold">فهرست مطالب (خودکار)</p>
              <ol className="flex flex-col gap-1 text-sm text-muted">
                {toc.map((t, i) => (
                  <li key={i} className={cn(t.level === 3 && "pe-4")}>{t.text}</li>
                ))}
              </ol>
            </div>
          )}

          {/* related */}
          <div className="card p-4">
            <p className="mb-3 text-sm font-bold">پیوندهای داخلی</p>
            <Field label="محصولات مرتبط (اسلاگ)" htmlFor="rp">
              <input id="rp" className="input" dir="ltr" value={post.relatedProductSlugs.join(", ")} onChange={(e) => set("relatedProductSlugs", e.target.value.split(",").map((s) => s.trim()).filter(Boolean))} placeholder="aria-star-commander" list="prod-list" />
              <datalist id="prod-list">{products.map((p) => <option key={p.id} value={p.slug} />)}</datalist>
            </Field>
            <div className="mt-3">
              <Field label="مقالات مرتبط (اسلاگ)" htmlFor="rb">
                <input id="rb" className="input" dir="ltr" value={post.relatedPostSlugs.join(", ")} onChange={(e) => set("relatedPostSlugs", e.target.value.split(",").map((s) => s.trim()).filter(Boolean))} placeholder="pla-vs-petg" list="post-list" />
                <datalist id="post-list">{getPublishedArticles().map((a) => <option key={a.slug} value={a.slug} />)}</datalist>
              </Field>
            </div>
          </div>
        </aside>
      </div>

      {/* preview */}
      <Modal open={preview} onClose={() => setPreview(false)} title="پیش‌نمایش مقاله" size="lg">
        <article className="max-h-[78vh] overflow-auto p-6">
          <h1 className="text-2xl font-extrabold">{post.title || "بدون عنوان"}</h1>
          <p className="mt-2 text-muted">{post.excerpt}</p>
          {post.cover && <img src={post.cover} alt={post.coverAlt || ""} className="mt-4 aspect-video w-full rounded-xl object-cover" />}
          <div className="mt-5 flex flex-col gap-3">
            {post.body.map((b) => (
              <BlockPreview key={b.id} block={b} />
            ))}
          </div>
        </article>
      </Modal>

      {/* cover picker */}
      <Modal open={coverPicker} onClose={() => setCoverPicker(false)} title="انتخاب تصویر شاخص" size="lg">
        <div className="max-h-[70vh] overflow-auto p-4">
          {localMedia.list().length === 0 ? (
            <p className="py-8 text-center text-sm text-muted">رسانه‌ای موجود نیست. به بخش «رسانه‌ها» بروید.</p>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {localMedia.list().map((m) => (
                <button key={m.id} type="button" onClick={() => { set("cover", m.url); set("coverAlt", m.alt); setCoverPicker(false); }} className="card overflow-hidden text-start hover:border-accent">
                  <img src={m.url} alt={m.alt} className="aspect-video w-full object-cover" />
                  <p className="truncate p-2 text-xs text-muted">{m.alt}</p>
                </button>
              ))}
            </div>
          )}
        </div>
      </Modal>

      <ConfirmDialog
        open={confirmBack}
        title="تغییرات ذخیره نشده"
        message="تغییرات ذخیره نشده دارید. آیا می‌خواهید بدون ذخیره خارج شوید؟"
        confirmText="خروج بدون ذخیره"
        danger
        onConfirm={() => navigate("/admin/posts")}
        onCancel={() => setConfirmBack(false)}
      />
    </div>
  );
}

function toFa(n: number) {
  return n.toLocaleString("fa-IR");
}

function BlockPreview({ block }: { block: Block }) {
  switch (block.type) {
    case "heading":
      return block.level === 3 ? (
        <h3 className="text-lg font-bold">{block.text}</h3>
      ) : (
        <h2 className="text-xl font-extrabold">{block.text}</h2>
      );
    case "paragraph":
      return <p className="leading-8 text-muted">{block.text}</p>;
    case "quote":
      return <blockquote className="border-s-2 border-accent ps-4 italic text-muted">«{block.text}»</blockquote>;
    case "callout":
      return <div className="rounded-xl border border-accent2/30 bg-accent2/5 p-4 leading-8">{block.text}</div>;
    case "cta":
      return <div className="rounded-xl bg-accent/10 p-4 text-center font-bold">{block.text}</div>;
    case "ordered-list":
      return <ol className="list-decimal pe-6 leading-8 text-muted">{(block.items ?? []).map((it, i) => <li key={i}>{it}</li>)}</ol>;
    case "unordered-list":
      return <ul className="list-disc pe-6 leading-8 text-muted">{(block.items ?? []).map((it, i) => <li key={i}>{it}</li>)}</ul>;
    case "image":
      return block.src ? <img src={block.src} alt={block.alt || ""} className="rounded-xl" /> : null;
    case "faq":
      return (
        <div className="flex flex-col gap-2">
          {(block.faqs ?? []).map((f, i) => (
            <div key={i} className="rounded-lg border border-line p-3">
              <p className="font-bold">{f.q}</p>
              <p className="text-sm text-muted">{f.a}</p>
            </div>
          ))}
        </div>
      );
    default:
      return null;
  }
}
