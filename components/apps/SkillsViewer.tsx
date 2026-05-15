"use client";

import skills from "@/content/skills.json";
import type { AppProps } from "@/lib/registry";

interface SkillGroup {
  category: string;
  items: { name: string; level: 1 | 2 | 3 | 4 | 5 }[];
}

const data = skills as SkillGroup[];

const LEVEL_LABEL: Record<number, string> = {
  1: "Familiar",
  2: "Working",
  3: "Comfortable",
  4: "Strong",
  5: "Expert",
};

export default function SkillsViewer(_props: AppProps) {
  return (
    <div className="p-6">
      <header className="mb-4">
        <h1 className="text-xl font-semibold">Skills</h1>
        <p className="text-sm text-[var(--color-fg-muted)]">
          A self-assessed snapshot. Levels reflect production exposure, not
          tutorials.
        </p>
      </header>
      <div className="flex flex-col gap-6">
        {data.map((group) => (
          <section key={group.category}>
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--color-fg-muted)]">
              {group.category}
            </h2>
            <ul className="flex flex-wrap gap-2">
              {group.items.map((item) => (
                <li
                  key={item.name}
                  className="flex items-center gap-2 rounded-full border border-[var(--color-border)] bg-[color-mix(in_oklch,var(--color-fg)_4%,transparent)] px-3 py-1 text-xs"
                  title={LEVEL_LABEL[item.level]}
                >
                  <span>{item.name}</span>
                  <span className="flex gap-0.5" aria-label={LEVEL_LABEL[item.level]}>
                    {Array.from({ length: 5 }).map((_, i) => (
                      <span
                        key={i}
                        className={
                          i < item.level
                            ? "h-1.5 w-1.5 rounded-full bg-[var(--color-accent)]"
                            : "h-1.5 w-1.5 rounded-full bg-[color-mix(in_oklch,var(--color-fg)_18%,transparent)]"
                        }
                      />
                    ))}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
