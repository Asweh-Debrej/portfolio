"use client";

import { useCallback, useRef, useState, type CSSProperties } from "react";
import { motion } from "motion/react";
import { useReducedMotion } from "@/lib/hooks/useMediaQuery";
import { useSound } from "@/lib/hooks/useSound";
import { useDrag } from "@/lib/hooks/useDrag";
import { useWindowStore } from "@/lib/store/windowStore";
import { type DesktopIconPos } from "@/lib/store/settingsStore";
import { type AppMeta } from "@/lib/registry";
import { cn } from "@/lib/utils";

/**
 * Desktop icon grid cell dimensions.
 *
 * The icon itself is 80 px wide; a small gutter on each side prevents labels
 * from clipping when long words wrap.
 */
export const ICON_CELL_W = 88;
export const ICON_CELL_H = 100;

interface DesktopIconProps {
  app: AppMeta;
  /** Grid position assigned by `<DesktopRoot>` (column, row). */
  pos: DesktopIconPos;
  /**
   * Called on drop: resolves the target cell, pins all icon positions so
   * non-stored icons don't shuffle around, and persists to the store.
   */
  onDrop: (id: string, col: number, row: number) => void;
  param?: string;
  label?: string;
}

/**
 * `<DesktopIcon>` — clickable + draggable shortcut on the desktop grid.
 *
 * Interaction model
 * -----------------
 * - Single click: select (visual highlight).
 * - Double click: open the app (`store.open`).
 * - Enter / Space when focused: open.
 * - Drag: pick up the icon. While dragging we mutate `transform` directly on
 *   the DOM node (no React renders). On release we snap to the nearest grid
 *   cell and persist via `settingsStore.setIconPosition`.
 *
 * Selection lives in local state; on touch / coarse pointer devices we treat
 * single tap as open (no concept of "select" on phones).
 */
export function DesktopIcon({
  app,
  pos,
  onDrop,
  param,
  label,
}: DesktopIconProps) {
  const Icon = app.icon;
  const open = useWindowStore((s) => s.open);
  const sound = useSound();
  const reducedMotion = useReducedMotion();

  const ref = useRef<HTMLButtonElement | null>(null);
  const draggingRef = useRef(false);
  const [selected, setSelected] = useState(false);

  const activate = useCallback(() => {
    sound("open");
    open(app.id, { param: param ?? app.defaultParam, defaultSize: app.defaultSize });
  }, [open, sound, app, param]);

  useDrag(ref, {
    disableSnap: true,
    onStart: () => {
      draggingRef.current = true;
      setSelected(true);
    },
    onMove: ({ dx, dy }) => {
      const el = ref.current;
      if (!el) return;
      el.style.transform = `translate3d(${dx}px, ${dy}px, 0)`;
      el.style.zIndex = "50";
    },
    onEnd: ({ dx, dy, moved }) => {
      const el = ref.current;
      if (el) {
        el.style.transform = "";
        el.style.zIndex = "";
      }
      // Clear dragging flag a tick later — gives the trailing click event
      // a chance to be suppressed.
      setTimeout(() => {
        draggingRef.current = false;
      }, 0);
      if (!moved) return;
      // Snap to nearest grid cell relative to current pos.
      const dCol = Math.round(dx / ICON_CELL_W);
      const dRow = Math.round(dy / ICON_CELL_H);
      const targetCol = Math.max(0, pos.col + dCol);
      const targetRow = Math.max(0, pos.row + dRow);
      onDrop(app.id, targetCol, targetRow);
    },
  });

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    // Suppress accidental click that fires after a drag.
    if (draggingRef.current) return;
    setSelected(true);
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (draggingRef.current) return;
    activate();
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      activate();
    }
  };

  const style: CSSProperties = {
    position: "absolute",
    left: pos.col * ICON_CELL_W,
    top: pos.row * ICON_CELL_H,
    touchAction: "none",
  };

  return (
    <motion.button
      ref={ref}
      type="button"
      role="button"
      aria-label={`Open ${app.title}`}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      onKeyDown={handleKey}
      onBlur={() => setSelected(false)}
      whileHover={reducedMotion ? undefined : { y: -2 }}
      transition={{ duration: 0.12 }}
      style={style}
      className={cn(
        "group flex w-20 select-none flex-col items-center gap-1.5 rounded-md p-2",
        "text-xs text-white outline-none",
        "focus-visible:bg-white/15",
        selected ? "bg-white/20" : "hover:bg-white/10",
      )}
    >
      <span
        className={cn(
          "flex h-12 w-12 items-center justify-center rounded-lg",
          "bg-gradient-to-br from-white/15 to-white/5 backdrop-blur-sm",
          "shadow-sm ring-1 ring-white/20",
          "transition-transform group-hover:scale-105",
        )}
      >
        <Icon size={26} strokeWidth={1.7} className="text-white drop-shadow" />
      </span>
      <span className="line-clamp-2 max-w-full text-center text-[11px] leading-tight drop-shadow-[0_1px_2px_rgba(0,0,0,0.7)]">
        {label ?? app.title}
      </span>
    </motion.button>
  );
}
