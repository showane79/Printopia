/**
 * Graceful image fallback for CMS-managed media.
 *
 * Images uploaded through the admin panel are served from R2 at /media/<key>.
 * If an object is ever missing (force-deleted while still referenced, or an old
 * row pointing at a removed key), a broken-image icon would leak into the page.
 * Hiding the element instead reveals the container's own placeholder background
 * (`bg-surface2`), so the layout keeps its exact shape and nothing looks broken.
 *
 * The guard flag stops any chance of an error → re-render → error loop.
 */
import type { SyntheticEvent } from "react";

export function onImgError(e: SyntheticEvent<HTMLImageElement>) {
  const el = e.currentTarget;
  if (el.dataset.failed) return;
  el.dataset.failed = "1";
  el.style.visibility = "hidden";
}

/** Spread onto any <img> that renders a CMS image. */
export const imgFallback = {
  loading: "lazy",
  decoding: "async",
  onError: onImgError,
} as const;
