// Persian-first formatting helpers. Persian digits are used site-wide
// for a consistent, native-feeling RTL experience.

const FA_DIGITS = ["۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹"];

export function toPersianDigits(input: string | number): string {
  return String(input).replace(/[0-9]/g, (d) => FA_DIGITS[Number(d)]);
}

/** Format a Toman amount, e.g. 480000 -> "۴۸۰٬۰۰۰ تومان" */
export function formatPrice(toman: number): string {
  const grouped = Math.round(toman)
    .toLocaleString("en-US")
    .replace(/,/g, "٬");
  return `${toPersianDigits(grouped)} تومان`;
}

/** Plain grouped number without currency, e.g. 1200 -> "۱٬۲۰۰" */
export function formatNumber(n: number): string {
  return toPersianDigits(n.toLocaleString("en-US").replace(/,/g, "٬"));
}

/** Compact duration, e.g. 3 -> "۳ روز" */
export function formatDays(days: number): string {
  return `${toPersianDigits(days)} روز`;
}

export function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    return new Intl.DateTimeFormat("fa-IR", {
      year: "numeric",
      month: "long",
      day: "numeric",
    }).format(d);
  } catch {
    return iso;
  }
}

export function discountPercent(price: number, oldPrice?: number): number | null {
  if (!oldPrice || oldPrice <= price) return null;
  return Math.round(((oldPrice - price) / oldPrice) * 100);
}
