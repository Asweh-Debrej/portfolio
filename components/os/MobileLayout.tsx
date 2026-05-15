"use client";

import { useState, useEffect, type ComponentType } from "react";
import { ChevronRight } from "lucide-react";
import { listApps, getAppMeta, type AppMeta } from "@/lib/registry";
import { WindowSkeleton } from "./WindowSkeleton";
import { cn } from "@/lib/utils";

/**
 * `<MobileLayout>` — fallback shell for narrow viewports (< 768px).
 *
 * The desktop metaphor doesn't translate well to phones: window dragging is
 * fiddly with one thumb, and screens are too small for overlapping content.
 * Instead, we render a clean, single-pane list view that progressively shows
 * each app inline.
 *
 * Activation
 * ----------
 * - The CSS media query (`md:hidden` / `hidden md:block`) decides which shell
 *   renders, so SSR output is layout-stable and no hydration flash occurs.
 */
export function MobileLayout({ initialAppId }: { initialAppId?: string }) {
  const apps = listApps().filter((a) => !a.hidden);
  const [activeId, setActiveId] = useState<string | null>(initialAppId ?? null);
  const [activeParam, setActiveParam] = useState<string | undefined>(undefined);
  const [Component, setComponent] = useState<ComponentType<{ param?: string }> | null>(null);

  // Lazy-load the active app's component.
  useEffect(() => {
    if (!activeId) {
      setComponent(null);
      return;
    }
    const meta = getAppMeta(activeId);
    if (!meta) return;
    let mounted = true;
    // Force the lazy import to resolve.
    Promise.resolve(meta.component).then(() => {
      if (!mounted) return;
      setComponent(() => meta.component as unknown as ComponentType<{ param?: string }>);
    });
    return () => {
      mounted = false;
    };
  }, [activeId]);

  const activeMeta = activeId ? getAppMeta(activeId) : null;

  return (
    <div className="flex min-h-svh flex-col bg-[var(--color-bg)] text-[var(--color-fg)]">
      <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-[var(--color-border)] bg-[var(--color-bg)]/85 px-4 py-3 backdrop-blur">
        {activeId && (
          <button
            type="button"
            onClick={() => {
              setActiveId(null);
              setActiveParam(undefined);
            }}
            aria-label="Back"
            className="-ml-1 inline-flex h-7 items-center gap-0.5 rounded-md px-1 text-xs text-[var(--color-fg-muted)] transition-colors hover:bg-[color-mix(in_oklch,var(--color-fg)_6%,transparent)]"
          >
            <ChevronRight size={16} className="rotate-180" />
            Back
          </button>
        )}
        <h1 className="flex-1 text-base font-semibold">
          {activeMeta ? (activeMeta.dynamicTitle?.(activeParam) ?? activeMeta.title) : "Portfolio"}
        </h1>
      </header>

      <main className="flex-1 p-4">
        {!activeId && (
          <ul className="flex flex-col gap-2">
            {apps.map((app) => (
              <AppRow
                key={app.id}
                app={app}
                onSelect={(param) => {
                  setActiveId(app.id);
                  setActiveParam(param);
                }}
              />
            ))}
          </ul>
        )}
        {activeId && (
          <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-window)]">
            {Component ? <Component param={activeParam} /> : <WindowSkeleton />}
          </div>
        )}
      </main>

      <footer className="border-t border-[var(--color-border)] px-4 py-3 text-center text-[11px] text-[var(--color-fg-muted)]">
        Built with Next.js · static-exported
      </footer>
    </div>
  );
}

function AppRow({
  app,
  onSelect,
}: {
  app: AppMeta;
  onSelect: (param?: string) => void;
}) {
  const Icon = app.icon;
  return (
    <li>
      <button
        type="button"
        onClick={() => onSelect()}
        className={cn(
          "flex w-full items-center gap-3 rounded-lg border border-[var(--color-border)] p-3 text-left",
          "transition-colors hover:bg-[color-mix(in_oklch,var(--color-fg)_5%,transparent)]",
        )}
      >
        <span className="flex h-9 w-9 items-center justify-center rounded-md bg-[color-mix(in_oklch,var(--color-fg)_8%,transparent)]">
          <Icon size={18} />
        </span>
        <span className="flex-1 text-sm font-medium">{app.title}</span>
        <ChevronRight size={16} className="text-[var(--color-fg-muted)]" />
      </button>
    </li>
  );
}
