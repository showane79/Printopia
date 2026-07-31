import { useEffect, useRef, type ReactNode } from "react";
import { Close } from "@/components/icons";
import { useOverlay } from "@/utils/useOverlay";
import { cn } from "@/utils/cn";

type Size = "sm" | "md" | "lg" | "xl";

const sizeClasses: Record<Size, string> = {
  sm: "sm:max-w-sm",
  md: "sm:max-w-lg",
  lg: "sm:max-w-3xl",
  xl: "sm:max-w-5xl",
};

export function Modal({
  open,
  onClose,
  title,
  label,
  size = "md",
  className,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  label?: string;
  size?: Size;
  className?: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useOverlay(open, onClose, ref);

  useEffect(() => {
    if (open) {
      const id = window.setTimeout(() => ref.current?.focus(), 20);
      return () => window.clearTimeout(id);
    }
  }, [open]);

  if (!open) return null;

  // Backdrop (100) and the dialog (110) are decoupled fixed siblings. The
  // centering wrapper is pointer-events-none so clicks outside the panel pass
  // through to the backdrop (close); the panel itself is pointer-events-auto.
  return (
    <>
      <div
        className="layer-backdrop overlay-backdrop anim-overlay fixed inset-0"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="layer-dialog pointer-events-none fixed inset-0 flex items-end justify-center p-0 sm:items-center sm:p-4">
        <div
          ref={ref}
          tabIndex={-1}
          role="dialog"
          aria-modal="true"
          aria-label={label || title}
          className={cn(
            "card anim-pop pointer-events-auto relative max-h-[92vh] w-full overflow-hidden outline-none",
            sizeClasses[size],
            className
          )}
        >
          <div className="flex items-center justify-between gap-4 border-b border-line px-5 py-4">
            {title ? <h2 className="text-lg font-bold">{title}</h2> : <span aria-hidden="true" />}
            <button
              onClick={onClose}
              aria-label="بستن"
              className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-line transition-colors hover:border-accent"
            >
              <Close className="h-5 w-5" />
            </button>
          </div>
          {children}
        </div>
      </div>
    </>
  );
}
