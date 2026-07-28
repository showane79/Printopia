import type { ReactNode } from "react";
import { cn } from "@/utils/cn";

export function SectionHeading({
  eyebrow,
  title,
  description,
  align = "center",
  className,
}: {
  eyebrow?: string;
  title: ReactNode;
  description?: ReactNode;
  align?: "center" | "start";
  className?: string;
}) {
  return (
    <div className={cn("max-w-2xl", align === "center" ? "mx-auto text-center" : "text-start", className)}>
      {eyebrow && (
        <span className="chip mb-3 border-accent/30 bg-accent/10 text-accent">{eyebrow}</span>
      )}
      <h2 className="text-2xl font-extrabold leading-tight md:text-4xl">{title}</h2>
      {description && <p className="mt-3 leading-8 text-muted">{description}</p>}
    </div>
  );
}
