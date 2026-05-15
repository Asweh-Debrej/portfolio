"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useReducedMotion } from "@/lib/hooks/useMediaQuery";
import { cn } from "@/lib/utils";

export interface MenuItem {
  label: string;
  onSelect?: () => void;
  separator?: boolean;
  disabled?: boolean;
  icon?: ReactNode;
  shortcut?: string;
}

interface ContextMenuProps {
  /** Children form the target area; right-click anywhere inside triggers the menu. */
  children: ReactNode;
  items: MenuItem[];
  className?: string;
}

/**
 * `<ContextMenu>` - wraps a region; right-click → menu at cursor.
 *
 * Position is clamped to viewport so the menu never overflows. Keyboard:
 * Esc closes, ↑/↓ navigate, Enter selects.
 */
export function ContextMenu({ children, items, className }: ContextMenuProps) {
  const [state, setState] = useState<{ x: number; y: number } | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [highlight, setHighlight] = useState(0);
  const reducedMotion = useReducedMotion();

  const onContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    setHighlight(0);
    setState({ x: e.clientX, y: e.clientY });
  };

  // Close on outside click / Esc / Scroll.
  useEffect(() => {
    if (!state) return;
    const close = () => setState(null);
    const onClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) close();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      else if (e.key === "ArrowDown") {
        e.preventDefault();
        setHighlight((h) => nextEnabled(items, h, 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setHighlight((h) => nextEnabled(items, h, -1));
      } else if (e.key === "Enter") {
        e.preventDefault();
        const item = items[highlight];
        if (item && !item.disabled && !item.separator) {
          item.onSelect?.();
          close();
        }
      }
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    window.addEventListener("blur", close);
    window.addEventListener("scroll", close, true);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("blur", close);
      window.removeEventListener("scroll", close, true);
    };
  }, [state, items, highlight]);

  // Clamp position after mount once we know menu size.
  useEffect(() => {
    if (!state || !menuRef.current) return;
    const r = menuRef.current.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    let { x, y } = state;
    if (x + r.width > vw) x = Math.max(8, vw - r.width - 8);
    if (y + r.height > vh) y = Math.max(8, vh - r.height - 8);
    if (x !== state.x || y !== state.y) setState({ x, y });
  }, [state]);

  return (
    <div onContextMenu={onContextMenu} className={className}>
      {children}
      <AnimatePresence>
        {state && (
          <motion.div
            ref={menuRef}
            role="menu"
            initial={reducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={reducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.96 }}
            transition={{ duration: reducedMotion ? 0 : 0.1 }}
            style={{ left: state.x, top: state.y }}
            className={cn(
              "fixed z-[9500] min-w-[200px] origin-top-left rounded-md py-1",
              "border border-[var(--color-border)] bg-[var(--color-window)] backdrop-blur-xl",
              "shadow-[var(--shadow-window)]",
            )}
          >
            {items.map((item, i) => {
              if (item.separator) {
                return (
                  <div
                    key={`sep-${i}`}
                    role="separator"
                    className="my-1 h-px bg-[var(--color-border)]"
                  />
                );
              }
              const active = i === highlight;
              return (
                <button
                  key={item.label}
                  type="button"
                  role="menuitem"
                  disabled={item.disabled}
                  onMouseEnter={() => setHighlight(i)}
                  onClick={() => {
                    if (item.disabled) return;
                    item.onSelect?.();
                    setState(null);
                  }}
                  className={cn(
                    "flex w-full items-center gap-3 px-3 py-1.5 text-left text-sm",
                    "transition-colors",
                    item.disabled
                      ? "cursor-not-allowed text-[var(--color-fg-muted)]/60"
                      : active
                        ? "bg-[var(--color-accent)] text-white"
                        : "text-[var(--color-fg)]",
                  )}
                >
                  {item.icon && <span className="flex h-4 w-4 items-center">{item.icon}</span>}
                  <span className="flex-1">{item.label}</span>
                  {item.shortcut && (
                    <span
                      className={cn(
                        "text-[11px]",
                        active ? "text-white/80" : "text-[var(--color-fg-muted)]",
                      )}
                    >
                      {item.shortcut}
                    </span>
                  )}
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function nextEnabled(items: MenuItem[], from: number, dir: 1 | -1): number {
  if (items.length === 0) return 0;
  let i = from;
  for (let step = 0; step < items.length; step++) {
    i = (i + dir + items.length) % items.length;
    if (!items[i].separator && !items[i].disabled) return i;
  }
  return from;
}
