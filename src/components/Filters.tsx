import type { MaterialId } from "@/data/products";
import { products } from "@/data/products";
import { categories } from "@/data/catalog";
import { formatPrice, toPersianDigits } from "@/utils/format";
import { Check } from "@/components/icons";
import { cn } from "@/utils/cn";

export interface FilterState {
  cats: string[];
  materials: string[];
  colors: string[];
  suitable: string[];
  inStock: boolean;
  customizable: boolean;
  min: number;
  max: number;
}

export const PRICE_FLOOR = 0;
export const PRICE_CEIL = 1_500_000;

export const allColors = Array.from(
  new Map(products.flatMap((p) => p.colors).map((c) => [c.name, c])).values()
);
export const allSuitable = Array.from(new Set(products.flatMap((p) => p.suitableFor))).sort((a, b) =>
  a.localeCompare(b, "fa")
);
export const materialList: MaterialId[] = ["PLA", "PETG", "Resin", "TPU"];

function CheckRow({
  checked,
  onChange,
  label,
  hint,
}: {
  checked: boolean;
  onChange: () => void;
  label: string;
  hint?: string;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2.5 py-1.5 text-sm transition-colors hover:text-fg">
      <span
        className={cn(
          "grid h-5 w-5 shrink-0 place-items-center rounded-md border transition",
          checked ? "border-accent bg-accent text-white" : "border-line bg-surface2"
        )}
      >
        {checked && <Check className="h-3.5 w-3.5" />}
      </span>
      <input type="checkbox" className="sr-only" checked={checked} onChange={onChange} />
      <span className="flex-1">{label}</span>
      {hint && <span className="text-xs text-muted">{hint}</span>}
    </label>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset className="border-t border-line py-4 first:border-t-0 first:pt-0">
      <legend className="mb-2 px-1 text-sm font-bold">{title}</legend>
      {children}
    </fieldset>
  );
}

export function Filters({
  state,
  onChange,
  onReset,
}: {
  state: FilterState;
  onChange: (next: Partial<FilterState>) => void;
  onReset: () => void;
}) {
  const toggle = (key: keyof FilterState, value: string) => {
    const arr = state[key] as string[];
    onChange({
      [key]: arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value],
    } as Partial<FilterState>);
  };

  const activeCount =
    state.cats.length +
    state.materials.length +
    state.colors.length +
    state.suitable.length +
    (state.inStock ? 1 : 0) +
    (state.customizable ? 1 : 0) +
    (state.max < PRICE_CEIL || state.min > PRICE_FLOOR ? 1 : 0);

  return (
    <div className="flex flex-col gap-1">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-base font-extrabold">
          فیلترها
          {activeCount > 0 && (
            <span className="grid h-5 min-w-5 place-items-center rounded-full bg-accent px-1 text-xs text-white">
              {toPersianDigits(activeCount)}
            </span>
          )}
        </h2>
        <button
          type="button"
          onClick={onReset}
          className="text-sm text-muted transition-colors hover:text-accent"
          disabled={activeCount === 0}
        >
          پاک کردن همه
        </button>
      </div>

      <Section title="دسته‌بندی">
        {categories.map((c) => (
          <CheckRow
            key={c.id}
            checked={state.cats.includes(c.id)}
            onChange={() => toggle("cats", c.id)}
            label={c.name}
          />
        ))}
      </Section>

      <Section title="محدوده قیمت (تومان)">
        <div className="mb-3 flex items-center justify-between text-sm text-muted">
          <span>{formatPrice(state.min)}</span>
          <span>تا {formatPrice(state.max)}</span>
        </div>
        <div className="flex flex-col gap-3">
          <label className="flex items-center gap-3 text-xs text-muted">
            <span className="w-8">از</span>
            <input
              type="range"
              min={PRICE_FLOOR}
              max={PRICE_CEIL}
              step={50_000}
              value={state.min}
              onChange={(e) => onChange({ min: Math.min(Number(e.target.value), state.max - 50_000) })}
              className="w-full accent-[var(--c-accent)]"
              aria-label="حداقل قیمت"
            />
          </label>
          <label className="flex items-center gap-3 text-xs text-muted">
            <span className="w-8">تا</span>
            <input
              type="range"
              min={PRICE_FLOOR}
              max={PRICE_CEIL}
              step={50_000}
              value={state.max}
              onChange={(e) => onChange({ max: Math.max(Number(e.target.value), state.min + 50_000) })}
              className="w-full accent-[var(--c-accent)]"
              aria-label="حداکثر قیمت"
            />
          </label>
        </div>
      </Section>

      <Section title="متریال">
        {materialList.map((m) => (
          <CheckRow
            key={m}
            checked={state.materials.includes(m)}
            onChange={() => toggle("materials", m)}
            label={m}
          />
        ))}
      </Section>

      <Section title="رنگ">
        <div className="flex flex-wrap gap-2 pt-1">
          {allColors.map((c) => {
            const active = state.colors.includes(c.name);
            return (
              <button
                key={c.name}
                type="button"
                onClick={() => toggle("colors", c.name)}
                aria-pressed={active}
                title={c.name}
                aria-label={c.name}
                className={cn(
                  "h-8 w-8 rounded-full border-2 transition",
                  active ? "border-accent ring-2 ring-accent/30" : "border-line"
                )}
                style={{ backgroundColor: c.hex }}
              />
            );
          })}
        </div>
      </Section>

      <Section title="مناسب برای">
        {allSuitable.map((s) => (
          <CheckRow
            key={s}
            checked={state.suitable.includes(s)}
            onChange={() => toggle("suitable", s)}
            label={s}
          />
        ))}
      </Section>

      <Section title="سایر">
        <CheckRow
          checked={state.inStock}
          onChange={() => onChange({ inStock: !state.inStock })}
          label="فقط موجودها"
        />
        <CheckRow
          checked={state.customizable}
          onChange={() => onChange({ customizable: !state.customizable })}
          label="قابلیت شخصی‌سازی"
        />
      </Section>
    </div>
  );
}
