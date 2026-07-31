/**
 * MediaStatusNotice — the single place that explains "why can't I add an image?"
 *
 * Image storage (Cloudflare R2) is optional: a Cloudflare account has it switched
 * off until the owner enables it, and the rest of the CMS is fully usable in that
 * state. So a missing bucket is never surfaced as an error or a broken screen —
 * it is a calm, actionable notice with one button that re-checks and, when
 * possible, finishes the setup by itself.
 *
 * Used by the Media page and by every image picker, so the wording and the
 * recovery path are identical everywhere.
 */

import { useState } from "react";
import { retryMediaSetup, MediaError, type MediaStatus } from "../services/media";

interface Props {
  status: MediaStatus;
  /** Called with the fresh status after a retry so the parent can unlock its UI. */
  onResolved: (next: MediaStatus) => void;
  /** Compact variant for inline use inside pickers and editors. */
  compact?: boolean;
}

export function MediaStatusNotice({ status, onResolved, compact }: Props) {
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");

  if (status.available) return null;

  async function retry() {
    setBusy(true);
    setNote("");
    try {
      const next = await retryMediaSetup();
      onResolved(next);
      // On success the notice unmounts; only a still-failing retry needs words.
      if (!next.available) setNote(next.message);
    } catch (err) {
      setNote(err instanceof MediaError ? err.message : "تلاش دوباره ناموفق بود.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      role="status"
      className={`rounded-xl border border-line bg-surface2 text-start ${compact ? "p-3" : "mb-5 p-4"}`}
    >
      <p className={`font-medium ${compact ? "text-xs" : "text-sm"}`}>بارگذاری تصویر در دسترس نیست</p>
      <p className={`mt-1 text-muted ${compact ? "text-[11px]" : "text-xs"}`}>{status.message}</p>

      {/* Reassurance first: the owner should not fear the site is broken. */}
      <p className={`mt-1 text-muted ${compact ? "text-[11px]" : "text-xs"}`}>
        سایت و بخش‌های دیگر پنل (نوشته‌ها، محصولات، تنظیمات) بدون مشکل کار می‌کنند.
      </p>

      {status.retryable && (
        <button
          type="button"
          onClick={() => void retry()}
          disabled={busy}
          className="btn btn-secondary mt-3 px-3 py-1.5 text-xs"
        >
          {busy ? "در حال بررسی…" : "بررسی دوباره"}
        </button>
      )}

      {note && <p className="mt-2 text-[11px] text-danger">{note}</p>}
    </div>
  );
}
