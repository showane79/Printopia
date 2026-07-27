import { useStore } from "@/context/StoreContext";
import { Check, Close, Sparkles } from "@/components/icons";
import { cn } from "@/utils/cn";

export function Toaster() {
  const { toasts, dismissToast } = useStore();
  return (
    <div
      className="fixed bottom-4 start-4 z-[90] flex w-[calc(100%-2rem)] max-w-sm flex-col gap-2"
      role="region"
      aria-label="اعلان‌ها"
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          role="status"
          className="glass anim-pop flex items-center gap-3 rounded-xl border border-line p-3 shadow-xl"
        >
          <span
            className={cn(
              "grid h-8 w-8 shrink-0 place-items-center rounded-lg",
              t.type === "error"
                ? "bg-danger/15 text-danger"
                : t.type === "info"
                ? "bg-accent2/15 text-accent2"
                : "bg-success/15 text-success"
            )}
          >
            {t.type === "error" ? (
              <Close className="h-5 w-5" />
            ) : t.type === "info" ? (
              <Sparkles className="h-5 w-5" />
            ) : (
              <Check className="h-5 w-5" />
            )}
          </span>
          <p className="flex-1 text-sm font-medium">{t.message}</p>
          <button
            onClick={() => dismissToast(t.id)}
            className="text-muted transition-colors hover:text-fg"
            aria-label="بستن اعلان"
          >
            <Close className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
