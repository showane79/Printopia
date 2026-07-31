import { useStore } from "@/context/StoreContext";
import { Moon, Sun } from "@/components/icons";
import { cn } from "@/utils/cn";

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, toggleTheme } = useStore();
  const isLight = theme === "light";
  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={cn(
        "grid h-10 w-10 place-items-center rounded-xl border border-line bg-surface2 text-fg transition-colors hover:border-accent",
        className
      )}
      aria-label={isLight ? "تغییر به حالت تاریک" : "تغییر به حالت روشن"}
      title={isLight ? "حالت تاریک" : "حالت روشن"}
    >
      {isLight ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
    </button>
  );
}
