import { Star } from "@/components/icons";

/**
 * UI placeholder only. We intentionally do NOT render an invented rating
 * number or fake reviews (per project integrity rules).
 */
export function RatingStars() {
  return (
    <div className="flex items-center gap-2">
      <div className="flex gap-0.5 text-warning/40" aria-hidden="true">
        {Array.from({ length: 5 }).map((_, i) => (
          <Star key={i} className="h-4 w-4" />
        ))}
      </div>
      <span className="text-xs text-muted">اولین امتیاز را ثبت کنید</span>
    </div>
  );
}
