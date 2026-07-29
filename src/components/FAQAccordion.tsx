import { useState } from "react";
import { ChevronDown } from "@/components/icons";
import { cn } from "@/utils/cn";

export interface QA {
  q: string;
  a: string;
}

export function FAQAccordion({ items, defaultIndex = 0 }: { items: QA[]; defaultIndex?: number }) {
  const [open, setOpen] = useState<number | null>(defaultIndex);

  return (
    <div className="flex flex-col gap-3">
      {items.map((it, i) => {
        const isOpen = open === i;
        return (
          <div key={i} className="card overflow-hidden">
            <h3>
              <button
                type="button"
                onClick={() => setOpen(isOpen ? null : i)}
                aria-expanded={isOpen}
                className="flex w-full items-center justify-between gap-4 p-5 text-start font-bold transition-colors hover:text-accent"
              >
                <span>{it.q}</span>
                <ChevronDown
                  className={cn(
                    "h-5 w-5 shrink-0 text-accent transition-transform duration-300",
                    isOpen && "rotate-180"
                  )}
                />
              </button>
            </h3>
            <div
              className={cn(
                "grid transition-all duration-300 ease-out",
                isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
              )}
            >
              <div className="overflow-hidden">
                <p className="px-5 pb-5 leading-8 text-muted">{it.a}</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
