"use client";

import { useMemo, useState } from "react";
import { Search, Star } from "lucide-react";
import { listProjects } from "@/lib/projects";
import { useWindowStore } from "@/lib/store/windowStore";
import { useSound } from "@/lib/hooks/useSound";
import type { AppProps } from "@/lib/registry";
import { cn } from "@/lib/utils";

export default function ProjectsExplorer(_props: AppProps) {
  const all = useMemo(listProjects, []);
  const [query, setQuery] = useState("");
  const [tag, setTag] = useState<string | null>(null);
  const open = useWindowStore((s) => s.open);
  const sound = useSound();

  const tags = useMemo(() => {
    const set = new Set<string>();
    for (const p of all) p.meta.tags?.forEach((t) => set.add(t));
    return Array.from(set).sort();
  }, [all]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return all.filter((p) => {
      if (tag && !p.meta.tags?.includes(tag)) return false;
      if (!q) return true;
      const haystack = [
        p.meta.title,
        p.meta.summary,
        p.meta.role,
        ...(p.meta.stack ?? []),
        ...(p.meta.tags ?? []),
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [all, query, tag]);

  const openProject = (slug: string) => {
    sound("open");
    open("project-viewer", { param: slug });
  };

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center gap-2 border-b border-[var(--color-border)] px-4 py-3">
        <div className="flex flex-1 items-center gap-2 rounded-md border border-[var(--color-border)] bg-[color-mix(in_oklch,var(--color-fg)_4%,transparent)] px-2.5 py-1.5">
          <Search size={14} className="text-[var(--color-fg-muted)]" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filter by title, stack, role…"
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-[var(--color-fg-muted)]"
            aria-label="Search projects"
          />
        </div>
      </header>

      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 border-b border-[var(--color-border)] px-4 py-2">
          <button
            type="button"
            onClick={() => setTag(null)}
            className={cn(
              "rounded-full px-2.5 py-0.5 text-xs transition-colors",
              tag === null
                ? "bg-[var(--color-accent)] text-white"
                : "border border-[var(--color-border)] hover:bg-[color-mix(in_oklch,var(--color-fg)_6%,transparent)]",
            )}
          >
            All
          </button>
          {tags.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTag(t === tag ? null : t)}
              className={cn(
                "rounded-full px-2.5 py-0.5 text-xs transition-colors",
                t === tag
                  ? "bg-[var(--color-accent)] text-white"
                  : "border border-[var(--color-border)] hover:bg-[color-mix(in_oklch,var(--color-fg)_6%,transparent)]",
              )}
            >
              {t}
            </button>
          ))}
        </div>
      )}

      <ul className="grid flex-1 auto-rows-min grid-cols-1 gap-3 overflow-y-auto p-4 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.length === 0 && (
          <li className="col-span-full py-12 text-center text-sm text-[var(--color-fg-muted)]">
            No projects match the filter.
          </li>
        )}
        {filtered.map((p) => (
          <li key={p.slug}>
            <button
              type="button"
              onClick={() => openProject(p.slug)}
              className={cn(
                "group flex h-full w-full flex-col gap-2 rounded-lg border border-[var(--color-border)] p-3 text-left",
                "transition-all hover:-translate-y-0.5 hover:border-[var(--color-accent)] hover:shadow-md",
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <h3 className="text-sm font-semibold">{p.meta.title}</h3>
                {p.meta.featured && (
                  <Star
                    size={14}
                    className="shrink-0 fill-[var(--color-accent)] text-[var(--color-accent)]"
                  />
                )}
              </div>
              <p className="text-xs text-[var(--color-fg-muted)] line-clamp-3">{p.meta.summary}</p>
              {p.meta.stack?.length > 0 && (
                <div className="mt-auto flex flex-wrap gap-1">
                  {p.meta.stack.slice(0, 4).map((s) => (
                    <span
                      key={s}
                      className="rounded bg-[color-mix(in_oklch,var(--color-fg)_8%,transparent)] px-1.5 py-0.5 text-[10px] text-[var(--color-fg-muted)]"
                    >
                      {s}
                    </span>
                  ))}
                </div>
              )}
              <div className="flex items-center justify-between text-[10px] text-[var(--color-fg-muted)]">
                <span>{p.meta.year}</span>
                <span>{p.meta.role}</span>
              </div>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
