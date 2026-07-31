import { type ReactNode } from "react";
import { Modal } from "@/components/Modal";
import { cn } from "@/utils/cn";

export function Field({
  label,
  htmlFor,
  hint,
  error,
  children,
}: {
  label: string;
  htmlFor?: string;
  hint?: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div>
      <label htmlFor={htmlFor} className="mb-1.5 block text-sm font-bold">
        {label}
      </label>
      {children}
      {hint && !error && <p className="mt-1 text-xs text-muted">{hint}</p>}
      {error && (
        <p role="alert" className="mt-1 text-xs text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

const statusMap: Record<string, { label: string; cls: string }> = {
  draft: { label: "پیش‌نویس", cls: "text-muted border-line bg-surface2/60" },
  published: { label: "منتشرشده", cls: "text-success border-success/30 bg-success/12" },
  archived: { label: "بایگانی‌شده", cls: "text-warning border-warning/30 bg-warning/12" },
};

export function StatusPill({ status }: { status: string }) {
  const s = statusMap[status] ?? statusMap.draft;
  return <span className={cn("chip", s.cls)}>{s.label}</span>;
}

export function Spinner({ label }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-3 py-10 text-muted">
      <span className="h-6 w-6 animate-spin rounded-full border-2 border-accent border-t-transparent" />
      {label && <span className="text-sm">{label}</span>}
    </div>
  );
}

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-xl font-extrabold md:text-2xl">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmText = "تأیید",
  cancelText = "انصراف",
  danger,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <Modal open={open} onClose={onCancel} title={title} size="sm">
      <div className="p-5">
        <p className="leading-8 text-muted">{message}</p>
        <div className="mt-5 flex justify-start gap-2">
          <button
            type="button"
            onClick={onConfirm}
            className={cn("btn", danger ? "bg-danger text-white hover:brightness-110" : "btn-primary")}
          >
            {confirmText}
          </button>
          <button type="button" onClick={onCancel} className="btn btn-secondary">
            {cancelText}
          </button>
        </div>
      </div>
    </Modal>
  );
}
