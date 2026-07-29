import { Breadcrumbs } from "@/components/Breadcrumbs";

export interface ProseSection {
  h?: string;
  p?: string;
  list?: string[];
}

export function Prose({
  title,
  intro,
  sections,
}: {
  title: string;
  intro?: string;
  sections: ProseSection[];
}) {
  return (
    <div className="container-x py-8">
      <Breadcrumbs items={[{ label: "خانه", to: "/" }, { label: title }]} />
      <article className="mx-auto mt-5 max-w-3xl">
        <h1 className="text-2xl font-extrabold md:text-3xl">{title}</h1>
        {intro && <p className="mt-3 leading-8 text-muted">{intro}</p>}
        <div className="mt-6 space-y-4">
          {sections.map((s, i) => (
            <section key={i} className="card p-6 md:p-7">
              {s.h && <h2 className="text-lg font-extrabold">{s.h}</h2>}
              {s.p && <p className="mt-2 leading-8 text-muted">{s.p}</p>}
              {s.list && (
                <ul className="mt-2 space-y-1.5 text-muted">
                  {s.list.map((li, j) => (
                    <li key={j} className="flex gap-2 leading-8">
                      <span className="mt-0.5 text-accent">◆</span> {li}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ))}
        </div>
      </article>
    </div>
  );
}
