import { useEffect, useRef, type ReactNode } from "react";
import { Close } from "@/components/icons";
import { useOverlay } from "@/utils/useOverlay";
import { cn } from "@/utils/cn";

export function Drawer({
  open,
  onClose,
  side = "start",
  title,
  label,
  children,
}: {
  open: boolean;
  onClose: () => void;
  side?: "start" | "end";
  title?: string;
  label?: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useOverlay(open, onClose);

  // Move focus into the drawer when it opens (accessibility).
  useEffect(() => {
    if (open) {
      const id = window.setTimeout(() => ref.current?.focus(), 30);
      return () => window.clearTimeout(id);
    }
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80]" role="presentation">
      <div
        className="anim-overlay absolute inset-0 bg-black/55"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        ref={ref}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={label || title}
        className={cn(
          "glass absolute bottom-0 top-0 z-10 flex w-[88%] max-w-sm flex-col border-line shadow-2xl outline-none",
          side === "start" ? "start-0 anim-slide-start" : "end-0 anim-slide-end"
        )}
      >
        <div className="flex h-16 shrink-0 items-center justify-between gap-4 border-b border-line px-5">
          {title ? <h2 className="text-lg font-bold">{title}</h2> : <span aria-hidden="true" />}
          <button
            onClick={onClose}
            aria-label="بستن"
            className="touch grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-line transition-colors hover:border-accent"
          >
            <Close className="h-5 w-5" />
          </button>
        </div>
        <div className="minw-0 flex-1 overflow-auto overscroll-contain p-5">{children}</div>
      </div>
    </div>
  );
}
