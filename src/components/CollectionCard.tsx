import { Link } from "react-router-dom";
import type { Collection } from "@/data/catalog";
import { ArrowLeft } from "@/components/icons";

export function CollectionCard({ collection }: { collection: Collection }) {
  return (
    <Link
      to={collection.to}
      className="group card overflow-hidden transition-all duration-300 hover:-translate-y-1.5 hover:border-accent/40"
    >
      <div className="relative aspect-[4/3] overflow-hidden">
        <img
          src={collection.image}
          alt={collection.name}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-canvas via-canvas/30 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 p-5">
          <h3 className="text-lg font-extrabold md:text-xl">{collection.name}</h3>
          <p className="mt-1 text-sm leading-7 text-muted">{collection.blurb}</p>
          <span className="mt-2 inline-flex items-center gap-1 text-sm font-bold text-accent transition-all group-hover:gap-2">
            مشاهده مجموعه <ArrowLeft className="h-4 w-4" />
          </span>
        </div>
      </div>
    </Link>
  );
}
