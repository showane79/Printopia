import { Link } from "react-router-dom";
import { ChevronLeft } from "@/components/icons";

export interface Crumb {
  label: string;
  to?: string;
}

export function Breadcrumbs({ items }: { items: Crumb[] }) {
  return (
    <nav aria-label="مسیر صفحه" className="text-sm text-muted">
      <ol className="flex flex-wrap items-center gap-1">
        {items.map((it, i) => (
          <li key={i} className="flex items-center gap-1">
            {i > 0 && <ChevronLeft className="h-4 w-4 opacity-50" />}
            {it.to ? (
              <Link className="transition-colors hover:text-fg" to={it.to}>
                {it.label}
              </Link>
            ) : (
              <span className="text-fg">{it.label}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
