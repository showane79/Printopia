import type { ReactNode } from "react";
import { cn } from "@/utils/cn";

type Variant = "accent" | "accent2" | "success" | "warning" | "danger" | "neutral";

const variants: Record<Variant, string> = {
  accent: "text-accent border-accent/30 bg-accent/12",
  accent2: "text-accent2 border-accent2/30 bg-accent2/12",
  success: "text-success border-success/30 bg-success/12",
  warning: "text-warning border-warning/30 bg-warning/12",
  danger: "text-danger border-danger/30 bg-danger/12",
  neutral: "text-muted border-line bg-surface2/60",
};

export function Badge({
  children,
  variant = "neutral",
  className,
}: {
  children: ReactNode;
  variant?: Variant;
  className?: string;
}) {
  return <span className={cn("chip", variants[variant], className)}>{children}</span>;
}
