import { Link } from "react-router-dom";
import type { BentoTile } from "@/data/catalog";
import { ArrowLeft } from "@/components/icons";
import { cn } from "@/utils/cn";

export function CategoryCard({ tile, className }: { tile: BentoTile; className?: string }) {
  return (
    <Link
      to={tile.to}
      className={cn(
        "group relative block h-full min-h-[180px] overflow-hidden rounded-[1.25rem] border border-line bg-surface transition-colors hover:border-accent/40",
        className
      )}
    >
      <img
        src={tile.image}
        alt={tile.name}
        loading="lazy"
        className="absolute inset-0 h-full w-full object-cover opacity-65 transition-all duration-500 group-hover:scale-105 group-hover:opacity-85"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-canvas via-canvas/55 to-transparent" />
      <div className="relative flex h-full flex-col justify-end p-5">
        <h3 className="text-lg font-extrabold md:text-xl">{tile.name}</h3>
        <p className="mt-1 line-clamp-2 text-sm leading-7 text-muted">{tile.blurb}</p>
        <span className="mt-3 inline-flex items-center gap-1 text-sm font-bold text-accent transition-all group-hover:gap-2">
          مشاهده <ArrowLeft className="h-4 w-4" />
        </span>
      </div>
    </Link>
  );
}
