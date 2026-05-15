"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Power, Search } from "lucide-react";
import { listApps } from "@/lib/registry";
import { useWindowStore } from "@/lib/store/windowStore";
import { useSound } from "@/lib/hooks/useSound";
import { useReducedMotion } from "@/lib/hooks/useMediaQuery";
import { useFocusTrap } from "@/lib/hooks/useFocusTrap";
import { cn } from "@/lib/utils";

interface StartMenuProps {
  open: boolean;
  onClose: () => void;
}

/**
 * `<StartMenu>` — popover above the Start button. Searchable app launcher.
 *
 * - Closes on outside click, `Esc`, or after launching an app.
 * - `↑` / `↓` navigate the result list, `Enter` launches the highlighted app.
 * - Includes a "Power" button which closes all windows (theatre clean-slate).
 */
export function StartMenu({ open, onClose }: StartMenuProps) {
  const panelRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [query, setQuery] = useState("");
  const [highlight, setHighlight] = useState(0);
  const reducedMotion = useReducedMotion();
  const sound = useSound();

  const openWin = useWindowStore((s) => s.open);
  const closeAll = useWindowStore((s) => s.closeAll);

  useFocusTrap(panelRef, open);

  const apps = useMemo(
    () =>
      listApps().filter((a) => {
        if (a.hidden) return false;
        if (!query.trim()) return true;
        const q = query.toLowerCase();
        return (
          a.title.toLowerCase().includes(q) ||
          (a.keywords ?? []).some((k) => k.toLowerCase().includes(q))
        );
      }),
    [query],
  );

  // Reset state on close, focus input on open.
  useEffect(() => {
    if (!open) {
      setQuery("");
      setHighlight(0);
    } else {
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  // Clamp highlight when result list shrinks.
  useEffect(() => {
    if (highlight >= apps.length) setHighlight(Math.max(0, apps.length - 1));
  }, [apps.length, highlight]);

  // Close on outside click / Esc.
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  const launch = (idx: number) => {
    const app = apps[idx];
    if (!app) return;
    sound("open");
    openWin(app.id, { defaultSize: app.defaultSize, param: app.defaultParam });
    onClose();
  };

  const handleListKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlight((h) => Math.min(apps.length - 1, h + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => Math.max(0, h - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      launch(highlight);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          ref={panelRef}
          role="dialog"
          aria-label="Start menu"
          initial={reducedMotion ? { opacity: 0 } : { opacity: 0, y: 10, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={reducedMotion ? { opacity: 0 } : { opacity: 0, y: 10, scale: 0.98 }}
          transition={{ duration: reducedMotion ? 0 : 0.15, ease: "easeOut" }}
          onKeyDown={handleListKey}
          className={cn(
            "fixed bottom-[calc(var(--taskbar-h,48px)+8px)] left-2 z-[8500] w-80",
            "rounded-xl border border-[var(--color-border)] bg-[var(--color-window)] backdrop-blur-2xl",
            "shadow-[var(--shadow-window)]",
          )}
        >
          {/* Search */}
          <div className="flex items-center gap-2 border-b border-[var(--color-border)] px-3 py-2">
            <Search size={16} className="text-[var(--color-fg-muted)]" />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search apps…"
              aria-label="Search apps"
              className="flex-1 bg-transparent text-sm text-[var(--color-fg)] outline-none placeholder:text-[var(--color-fg-muted)]"
            />
          </div>

          {/* App list */}
          <ul
            role="listbox"
            aria-label="Applications"
            className="max-h-80 overflow-y-auto p-2"
          >
            {apps.length === 0 && (
              <li className="px-3 py-6 text-center text-sm text-[var(--color-fg-muted)]">
                No apps match &ldquo;{query}&rdquo;.
              </li>
            )}
            {apps.map((app, i) => {
              const Icon = app.icon;
              const active = i === highlight;
              return (
                <li key={app.id}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={active}
                    onMouseEnter={() => setHighlight(i)}
                    onClick={() => launch(i)}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-md px-2 py-2 text-left text-sm",
                      "transition-colors",
                      active
                        ? "bg-[var(--color-accent)] text-white"
                        : "text-[var(--color-fg)] hover:bg-[color-mix(in_oklch,var(--color-fg)_8%,transparent)]",
                    )}
                  >
                    <span
                      className={cn(
                        "flex h-7 w-7 shrink-0 items-center justify-center rounded-md",
                        active
                          ? "bg-white/20"
                          : "bg-[color-mix(in_oklch,var(--color-fg)_10%,transparent)]",
                      )}
                    >
                      <Icon size={16} />
                    </span>
                    <span className="flex-1 truncate">{app.title}</span>
                  </button>
                </li>
              );
            })}
          </ul>

          {/* Footer */}
          <div className="flex items-center justify-between border-t border-[var(--color-border)] px-3 py-2">
            <span className="text-[11px] text-[var(--color-fg-muted)]">
              Shift+Esc to toggle
            </span>
            <button
              type="button"
              aria-label="Close all windows"
              onClick={() => {
                sound("close");
                closeAll();
                onClose();
              }}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs",
                "text-[var(--color-fg-muted)] transition-colors",
                "hover:bg-red-500/85 hover:text-white",
              )}
            >
              <Power size={13} />
              Close all
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
