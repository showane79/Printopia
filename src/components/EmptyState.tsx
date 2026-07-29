import type { ReactNode } from "react";
import { cn } from "@/utils/cn";

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: ReactNode;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("card flex flex-col items-center justify-center gap-3 p-10 text-center md:p-16", className)}>
      {icon && (
        <div className="grid h-16 w-16 place-items-center rounded-2xl bg-surface2 text-accent">{icon}</div>
      )}
      <h3 className="text-xl font-bold">{title}</h3>
      {description && <p className="max-w-md leading-8 text-muted">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
