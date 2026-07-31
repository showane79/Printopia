/**
 * MediaPicker — one shared "choose an image" modal.
 *
 * The library is fetched from the server every time the picker opens, so an
 * image uploaded on a phone is instantly selectable on a laptop. Previously
 * each caller read a localStorage list synchronously during render, which is
 * why media never appeared across devices.
 */

import { useEffect, useState } from "react";
import { Modal } from "../../components/Modal";

import { listMedia, MediaError } from "../services/media";
import type { AdminMedia } from "../types";

interface Props {
  open: boolean;
  onClose: () => void;
  /** Receives the stored URL and its alt text so callers can fill both fields. */
  onSelect: (url: string, alt: string) => void;
}

export function MediaPicker({ open, onClose, onSelect }: Props) {
  const [items, setItems] = useState<AdminMedia[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    let alive = true;
    setLoading(true);
    setError("");
    listMedia()
      .then((m) => { if (alive) setItems(m); })
      .catch((e) => { if (alive) setError(e instanceof MediaError ? e.message : "بارگذاری رسانه‌ها ناموفق بود."); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [open]);

  return (
    <Modal open={open} onClose={onClose} title="انتخاب تصویر" size="lg">
      <div className="max-h-[70vh] overflow-auto p-4">
        {loading ? (
          <p className="py-8 text-center text-sm text-muted">در حال بارگذاری…</p>
        ) : error ? (
          <p className="py-8 text-center text-sm text-danger">{error}</p>
        ) : items.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted">رسانه‌ای موجود نیست. به بخش «رسانه‌ها» بروید و تصویری بارگذاری کنید.</p>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {items.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => { onSelect(m.url, m.alt); onClose(); }}
                className="card overflow-hidden text-start hover:border-accent"
              >
                <img
                  src={m.url}
                  alt={m.alt}
                  width={m.width || undefined}
                  height={m.height || undefined}
                  loading="lazy"
                  decoding="async"
                  className="aspect-video w-full object-cover"
                />
                <p className="truncate p-2 text-xs text-muted">{m.alt}</p>
              </button>
            ))}
          </div>
        )}
      </div>
    </Modal>
  );
}
