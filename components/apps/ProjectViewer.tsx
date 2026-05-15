"use client";

import { ExternalLink, ArrowLeft } from "lucide-react";
import { useMemo } from "react";
import { getProjectBySlug, listProjects } from "@/lib/projects";
import { useWindowStore } from "@/lib/store/windowStore";
import type { AppProps } from "@/lib/registry";

export default function ProjectViewer({ param }: AppProps) {
  const project = useMemo(
    () => (param ? getProjectBySlug(param) : listProjects()[0]),
    [param],
  );
  const open = useWindowStore((s) => s.open);

  if (!project) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
        <p className="text-sm text-[var(--color-fg-muted)]">
          Project &ldquo;{param}&rdquo; not found.
        </p>
        <button
          type="button"
          onClick={() => open("projects")}
          className="inline-flex items-center gap-1.5 rounded-md border border-[var(--color-border)] px-3 py-1.5 text-xs transition-colors hover:bg-[color-mix(in_oklch,var(--color-fg)_6%,transparent)]"
        >
          <ArrowLeft size={13} /> Back to projects
        </button>
      </div>
    );
  }

  const { meta, Component } = project;

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-start gap-3 border-b border-[var(--color-border)] p-4">
        <button
          type="button"
          aria-label="Back to projects"
          onClick={() => open("projects")}
          className="mt-1 inline-flex h-6 w-6 items-center justify-center rounded-md text-[var(--color-fg-muted)] transition-colors hover:bg-[color-mix(in_oklch,var(--color-fg)_8%,transparent)] hover:text-[var(--color-fg)]"
        >
          <ArrowLeft size={14} />
        </button>
        <div className="flex-1">
          <h1 className="text-lg font-semibold">{meta.title}</h1>
          <p className="mt-0.5 text-xs text-[var(--color-fg-muted)]">
            {meta.role} · {meta.year}
          </p>
          {meta.stack?.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {meta.stack.map((s) => (
                <span
                  key={s}
                  className="rounded bg-[color-mix(in_oklch,var(--color-fg)_8%,transparent)] px-1.5 py-0.5 text-[10px]"
                >
                  {s}
                </span>
              ))}
            </div>
          )}
          {meta.links?.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {meta.links.map((l) => (
                <a
                  key={l.href}
                  href={l.href}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="inline-flex items-center gap-1 text-xs text-[var(--color-accent)] hover:underline"
                >
                  {l.label} <ExternalLink size={11} />
                </a>
              ))}
            </div>
          )}
        </div>
      </header>
      <article className="prose prose-sm max-w-none overflow-y-auto p-6 dark:prose-invert">
        <Component />
      </article>
    </div>
  );
}
