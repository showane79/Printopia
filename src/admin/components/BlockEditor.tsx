import { useState } from "react";
import type { Block, BlockType, FaqPair } from "../types";
import { localMedia } from "../services/media";
import { Modal } from "@/components/Modal";
import { ArrowUp, Plus, Trash } from "@/components/icons";
import { cn } from "@/utils/cn";

let counter = 0;
function newId() {
  counter += 1;
  return `b_${Date.now().toString(36)}_${counter}`;
}

function makeBlock(type: BlockType): Block {
  const base: Block = { id: newId(), type };
  switch (type) {
    case "heading":
      return { ...base, level: 2, text: "" };
    case "ordered-list":
    case "unordered-list":
      return { ...base, items: [""] };
    case "image":
      return { ...base, src: "", alt: "" };
    case "faq":
      return { ...base, faqs: [{ q: "", a: "" }] };
    default:
      return { ...base, text: "" };
  }
}

const BLOCK_LABELS: Record<BlockType, string> = {
  heading: "تیتر",
  paragraph: "پاراگراف",
  "ordered-list": "فهرست شماره‌دار",
  "unordered-list": "فهرست نقطه‌ای",
  quote: "نقل‌قول",
  callout: "کادر تأکید",
  image: "تصویر",
  cta: "دکمه فراخوان (CTA)",
  faq: "سؤالات متداول",
};

export function BlockEditor({ value, onChange }: { value: Block[]; onChange: (b: Block[]) => void }) {
  const [pickerFor, setPickerFor] = useState<string | null>(null);

  const update = (id: string, patch: Partial<Block>) =>
    onChange(value.map((b) => (b.id === id ? { ...b, ...patch } : b)));
  const remove = (id: string) => onChange(value.filter((b) => b.id !== id));
  const move = (index: number, dir: -1 | 1) => {
    const next = [...value];
    const target = index + dir;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  };
  const add = (type: BlockType) => onChange([...value, makeBlock(type)]);

  return (
    <div className="flex flex-col gap-3">
      {value.length === 0 && (
        <p className="rounded-xl border border-dashed border-line bg-surface2 p-6 text-center text-sm text-muted">
          هنوز بخشی اضافه نشده. از پایین یک بخش جدید بسازید.
        </p>
      )}

      {value.map((b, i) => (
        <div key={b.id} className="card p-4">
          <div className="mb-3 flex items-center justify-between gap-2">
            <span className="chip border-accent/30 bg-accent/10 text-accent">{BLOCK_LABELS[b.type]}</span>
            <div className="flex items-center gap-1">
              <button type="button" onClick={() => move(i, -1)} disabled={i === 0} aria-label="بالا" className="grid h-8 w-8 place-items-center rounded-lg border border-line disabled:opacity-30 hover:border-accent">
                <ArrowUp className="h-4 w-4" />
              </button>
              <button type="button" onClick={() => move(i, 1)} disabled={i === value.length - 1} aria-label="پایین" className="grid h-8 w-8 place-items-center rounded-lg border border-line disabled:opacity-30 hover:border-accent">
                <ArrowUp className="h-4 w-4 rotate-180" />
              </button>
              <button type="button" onClick={() => remove(b.id)} aria-label="حذف بخش" className="grid h-8 w-8 place-items-center rounded-lg border border-line text-danger hover:border-danger">
                <Trash className="h-4 w-4" />
              </button>
            </div>
          </div>

          {b.type === "heading" && (
            <div className="flex flex-col gap-2 sm:flex-row">
              <select
                className="input sm:w-28"
                value={b.level ?? 2}
                onChange={(e) => update(b.id, { level: Number(e.target.value) as 2 | 3 })}
                aria-label="سطح تیتر"
              >
                <option value={2}>تیتر ۲</option>
                <option value={3}>تیتر ۳</option>
              </select>
              <input
                className="input flex-1"
                placeholder="متن تیتر"
                value={b.text ?? ""}
                onChange={(e) => update(b.id, { text: e.target.value })}
              />
            </div>
          )}

          {(b.type === "paragraph" || b.type === "quote" || b.type === "callout" || b.type === "cta") && (
            <textarea
              className="input min-h-24 resize-y"
              placeholder="متن خود را بنویسید..."
              value={b.text ?? ""}
              onChange={(e) => update(b.id, { text: e.target.value })}
            />
          )}

          {(b.type === "ordered-list" || b.type === "unordered-list") && (
            <div className="flex flex-col gap-2">
              {(b.items ?? []).map((it, idx) => (
                <div key={idx} className="flex gap-2">
                  <input
                    className="input flex-1"
                    placeholder={`مورد ${idx + 1}`}
                    value={it}
                    onChange={(e) => {
                      const items = [...(b.items ?? [])];
                      items[idx] = e.target.value;
                      update(b.id, { items });
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => update(b.id, { items: (b.items ?? []).filter((_, j) => j !== idx) })}
                    aria-label="حذف مورد"
                    className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-line text-danger hover:border-danger"
                  >
                    <Trash className="h-4 w-4" />
                  </button>
                </div>
              ))}
              <button type="button" onClick={() => update(b.id, { items: [...(b.items ?? []), ""] })} className="btn btn-ghost self-start text-sm text-accent">
                <Plus className="h-4 w-4" /> افزودن مورد
              </button>
            </div>
          )}

          {b.type === "image" && (
            <div className="flex flex-col gap-2">
              {b.src && (
                <img src={b.src} alt={b.alt || ""} className="max-h-48 w-full rounded-xl object-cover" />
              )}
              <div className="flex gap-2">
                <input className="input flex-1" dir="ltr" placeholder="آدرس تصویر (URL)" value={b.src ?? ""} onChange={(e) => update(b.id, { src: e.target.value })} />
                <button type="button" onClick={() => setPickerFor(b.id)} className="btn btn-secondary shrink-0">
                  از رسانه‌ها
                </button>
              </div>
              <input className="input" placeholder="متن جایگزین تصویر (الزامی)" value={b.alt ?? ""} onChange={(e) => update(b.id, { alt: e.target.value })} />
            </div>
          )}

          {b.type === "faq" && (
            <div className="flex flex-col gap-3">
              {(b.faqs ?? []).map((pair: FaqPair, idx) => (
                <div key={idx} className="rounded-xl border border-line p-3">
                  <div className="mb-2 flex justify-end">
                    <button type="button" onClick={() => update(b.id, { faqs: (b.faqs ?? []).filter((_, j) => j !== idx) })} className="text-danger" aria-label="حذف سؤال">
                      <Trash className="h-4 w-4" />
                    </button>
                  </div>
                  <input className="input mb-2" placeholder="سؤال" value={pair.q} onChange={(e) => { const faqs = [...(b.faqs ?? [])]; faqs[idx] = { ...pair, q: e.target.value }; update(b.id, { faqs }); }} />
                  <textarea className="input min-h-16 resize-y" placeholder="پاسخ" value={pair.a} onChange={(e) => { const faqs = [...(b.faqs ?? [])]; faqs[idx] = { ...pair, a: e.target.value }; update(b.id, { faqs }); }} />
                </div>
              ))}
              <button type="button" onClick={() => update(b.id, { faqs: [...(b.faqs ?? []), { q: "", a: "" }] })} className="btn btn-ghost self-start text-sm text-accent">
                <Plus className="h-4 w-4" /> افزودن سؤال
              </button>
            </div>
          )}
        </div>
      ))}

      {/* add block */}
      <div className="flex flex-wrap gap-2 rounded-xl border border-dashed border-line bg-surface2 p-3">
        {(Object.keys(BLOCK_LABELS) as BlockType[]).map((t) => (
          <button key={t} type="button" onClick={() => add(t)} className={cn("chip hover:border-accent")}>
            <Plus className="h-3.5 w-3.5" /> {BLOCK_LABELS[t]}
          </button>
        ))}
      </div>

      <Modal open={!!pickerFor} onClose={() => setPickerFor(null)} title="انتخاب از رسانه‌ها" size="lg">
        <div className="max-h-[70vh] overflow-auto p-4">
          {localMedia.list().length === 0 ? (
            <p className="py-8 text-center text-sm text-muted">هیچ رسانه‌ای بارگذاری نشده. ابتدا به بخش «رسانه‌ها» بروید.</p>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {localMedia.list().map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => {
                    if (pickerFor) update(pickerFor, { src: m.url, alt: m.alt });
                    setPickerFor(null);
                  }}
                  className="card overflow-hidden text-start hover:border-accent"
                >
                  <img src={m.url} alt={m.alt} className="aspect-video w-full object-cover" />
                  <p className="truncate p-2 text-xs text-muted">{m.alt}</p>
                </button>
              ))}
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
