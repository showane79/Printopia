import { useEffect, useRef } from "react";

/**
 * Shared behaviour for modal/drawer overlays:
 * - close on Escape
 * - lock background scroll while open
 * - restore focus to the trigger when closed
 */
export function useOverlay(open: boolean, onClose: () => void) {
  const prevFocus = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;
    prevFocus.current = document.activeElement as HTMLElement;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
      prevFocus.current?.focus?.();
    };
  }, [open, onClose]);
}
