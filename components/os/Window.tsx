"use client";

import {
  Suspense,
  memo,
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { motion } from "motion/react";
import { Maximize2, Minimize2, Minus, X } from "lucide-react";
import { useDrag } from "@/lib/hooks/useDrag";
import { useResize, type ResizeDir } from "@/lib/hooks/useResize";
import { useFocusTrap } from "@/lib/hooks/useFocusTrap";
import { useSound } from "@/lib/hooks/useSound";
import { useReducedMotion } from "@/lib/hooks/useMediaQuery";
import { useWindowStore, type WindowState } from "@/lib/store/windowStore";
import { WindowSkeleton } from "./WindowSkeleton";
import { cn } from "@/lib/utils";

interface WindowProps {
  id: string;
  title: string;
  icon: ReactNode;
  children: ReactNode;
}

const RESIZE_DIRS: ResizeDir[] = ["n", "s", "e", "w", "ne", "nw", "se", "sw"];

const HANDLE_CURSORS: Record<ResizeDir, string> = {
  n: "ns-resize",
  s: "ns-resize",
  e: "ew-resize",
  w: "ew-resize",
  ne: "nesw-resize",
  sw: "nesw-resize",
  nw: "nwse-resize",
  se: "nwse-resize",
};

/** Snap-back / snap-to-edge transition (Windows 11 style). */
const SNAP_TRANSITION =
  "left 180ms cubic-bezier(.2,.85,.4,1), top 180ms cubic-bezier(.2,.85,.4,1), width 180ms cubic-bezier(.2,.85,.4,1), height 180ms cubic-bezier(.2,.85,.4,1)";

/**
 * `<Window>` - single OS window.
 *
 * Performance contract
 * --------------------
 * - Subscribes to its **own slice** of the window store (`windows[id]`). Other
 *   windows updating never re-render this one.
 * - During header-drag, we **bypass React**: pointer moves write
 *   `transform: translate3d(...)` directly to the DOM. The store is only
 *   touched on drag-end. This keeps drag at compositor frame-rate (no
 *   reconciliation per pointermove).
 *
 * Maximize geometry
 * -----------------
 * The parent container (`#main-content` in `<DesktopRoot>`) already reserves
 * the taskbar via `bottom: var(--taskbar-h)`. Therefore a maximized window
 * uses `inset: 0` / `height: 100%` - **do not** subtract the taskbar again or
 * you'll get a ~48px gap.
 *
 * Snap animation
 * --------------
 * After `applySnap` we set `isSnapping=true` for 200ms which enables a CSS
 * transition on left/top/width/height. Transitions are off by default to keep
 * drag/resize responsive.
 */
function WindowImpl({ id, title, icon, children }: WindowProps) {
  const headerRef = useRef<HTMLDivElement | null>(null);
  const bodyRef = useRef<HTMLDivElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const sound = useSound();
  const reducedMotion = useReducedMotion();

  // Subscribe only to this window's slice - sibling moves don't re-render us.
  const state = useWindowStore((s) => s.windows[id]);
  const focusedId = useWindowStore((s) => s.focusedId);
  const isFocused = focusedId === id;

  const move = useWindowStore((s) => s.move);
  const resize = useWindowStore((s) => s.resize);
  const focus = useWindowStore((s) => s.focus);
  const close = useWindowStore((s) => s.close);
  const minimize = useWindowStore((s) => s.minimize);
  const toggleMax = useWindowStore((s) => s.toggleMax);
  const restoreFromMaxAt = useWindowStore((s) => s.restoreFromMaxAt);
  const setDragPreview = useWindowStore((s) => s.setDragPreview);
  const applySnap = useWindowStore((s) => s.applySnap);

  // Mirror `state` into a ref so drag handlers can read the latest values
  // without retriggering the drag effect.
  const stateRef = useRef(state);
  stateRef.current = state;

  const [isSnapping, setIsSnapping] = useState(false);
  const snapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const triggerSnapAnim = useCallback(() => {
    if (reducedMotion) return;
    setIsSnapping(true);
    if (snapTimerRef.current) clearTimeout(snapTimerRef.current);
    snapTimerRef.current = setTimeout(() => setIsSnapping(false), 220);
  }, [reducedMotion]);
  useEffect(
    () => () => {
      if (snapTimerRef.current) clearTimeout(snapTimerRef.current);
    },
    [],
  );

  // Trap focus inside the window when it's the focused one.
  useFocusTrap(containerRef, isFocused, { initialFocus: "none" });

  // ------- Header drag (compositor-only) ----------------------------------
  // Origin = window's committed (x,y) at the moment the drag actually starts.
  // We then write `transform: translate3d(dx,dy,0)` per pointer-move and
  // commit `originX + dx, originY + dy` on drag-end.
  const originRef = useRef({ x: 0, y: 0 });

  useDrag(headerRef, {
    onStart: ({ cursorX, cursorY }) => {
      const cur = stateRef.current;
      if (!cur) return;
      focus(id);
      // Issue 5: drag from header while maximized → restore mid-drag, anchor
      // window so the cursor stays over the header.
      if (cur.maximized) {
        const anchored = restoreFromMaxAt(id, cursorX, cursorY);
        if (anchored) {
          originRef.current = anchored;
          return;
        }
      }
      originRef.current = { x: cur.x, y: cur.y };
    },
    onMove: ({ dx, dy }) => {
      const el = containerRef.current;
      if (!el) return;
      // GPU-only: no React render, no store write.
      el.style.transform = `translate3d(${dx}px, ${dy}px, 0)`;
    },
    onSnapChange: (snap) => {
      setDragPreview({ side: snap, visible: !!snap });
    },
    onEnd: ({ snap, dx, dy, moved }) => {
      setDragPreview({ side: null, visible: false });
      const el = containerRef.current;
      if (el) el.style.transform = "";
      if (!moved) return;
      if (snap) {
        applySnap(id, snap);
        triggerSnapAnim();
        return;
      }
      const cur = stateRef.current;
      if (!cur) return;
      move(id, originRef.current.x + dx, originRef.current.y + dy);
    },
    disabled: false, // we now handle maximized-drag explicitly above
  });

  const focusHandler = useCallback(() => focus(id), [focus, id]);

  const handleClose = useCallback(() => {
    sound("close");
    close(id);
  }, [close, sound, id]);

  const handleMinimize = useCallback(() => {
    sound("click");
    minimize(id);
  }, [minimize, sound, id]);

  const handleToggleMax = useCallback(() => {
    sound("click");
    toggleMax(id);
    triggerSnapAnim();
  }, [toggleMax, sound, id, triggerSnapAnim]);

  // Store can be ahead of us during cleanup; render nothing if state is gone.
  if (!state) return null;

  const style: CSSProperties = state.maximized
    ? {
        // Parent (#main-content) already excludes the taskbar - use full extent.
        left: 0,
        top: 0,
        right: 0,
        bottom: 0,
        width: "auto",
        height: "auto",
        zIndex: state.zIndex,
      }
    : {
        left: state.x,
        top: state.y,
        width: state.w,
        height: state.h,
        zIndex: state.zIndex,
      };
  if (isSnapping) {
    style.transition = SNAP_TRANSITION;
  }

  return (
    <motion.div
      ref={containerRef}
      role="dialog"
      aria-labelledby={`window-${id}-title`}
      aria-modal="false"
      tabIndex={-1}
      initial={reducedMotion ? false : { opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={reducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.96 }}
      transition={{ duration: reducedMotion ? 0 : 0.14, ease: "easeOut" }}
      style={style}
      className={cn(
        "absolute flex flex-col overflow-hidden border border-[var(--color-border)]",
        "rounded-[var(--radius-window)] backdrop-blur-xl",
        // Bumped alpha for legibility against busy wallpapers (issue 9).
        "bg-[var(--color-window)] shadow-[var(--shadow-window)]",
        isFocused && "shadow-[var(--shadow-focused)] ring-2 ring-[var(--color-ring)]",
        state.maximized && "rounded-none",
      )}
      onPointerDown={focusHandler}
      data-window-id={id}
    >
      {/* Header - solid surface on focus for better text contrast (issue 9). */}
      <div
        ref={headerRef}
        className={cn(
          "flex h-9 shrink-0 cursor-default select-none items-center gap-2 pl-3 pr-1",
          "border-b border-[var(--color-border)]",
          isFocused
            ? "bg-[var(--color-bg-elevated)]"
            : "bg-[color-mix(in_oklch,var(--color-bg-elevated)_82%,transparent)]",
        )}
        onDoubleClick={handleToggleMax}
      >
        <span className="flex shrink-0 items-center text-[var(--color-fg-muted)]">{icon}</span>
        <h2
          id={`window-${id}-title`}
          className={cn(
            "flex-1 truncate text-[13px] font-medium",
            isFocused ? "text-[var(--color-fg)]" : "text-[var(--color-fg-muted)]",
          )}
        >
          {title}
        </h2>
        <div className="flex items-center gap-0.5" data-no-drag>
          <WindowButton
            label="Minimize"
            onClick={handleMinimize}
            icon={<Minus size={14} strokeWidth={2.5} />}
          />
          <WindowButton
            label={state.maximized ? "Restore" : "Maximize"}
            onClick={handleToggleMax}
            icon={
              state.maximized ? (
                <Minimize2 size={13} strokeWidth={2.2} />
              ) : (
                <Maximize2 size={13} strokeWidth={2.2} />
              )
            }
          />
          <WindowButton
            label="Close"
            onClick={handleClose}
            danger
            icon={<X size={15} strokeWidth={2.5} />}
          />
        </div>
      </div>

      {/* Body */}
      <div
        ref={bodyRef}
        className="relative min-h-0 flex-1 overflow-auto bg-[var(--color-bg)] text-[var(--color-fg)]"
      >
        <Suspense fallback={<WindowSkeleton />}>{children}</Suspense>
      </div>

      {/* Resize handles */}
      {!state.maximized &&
        RESIZE_DIRS.map((dir) => (
          <ResizeHandle
            key={dir}
            dir={dir}
            cursor={HANDLE_CURSORS[dir]}
            geometry={() => ({ x: state.x, y: state.y, w: state.w, h: state.h })}
            onResize={(g) => resize(id, g.w, g.h, g.x, g.y)}
          />
        ))}
    </motion.div>
  );
}

// Memoized export - only re-renders when its own slice of state changes.
export const Window = memo(WindowImpl);

// ----- Internal components -------------------------------------------------

function WindowButton({
  label,
  onClick,
  icon,
  danger,
}: {
  label: string;
  onClick: () => void;
  icon: ReactNode;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className={cn(
        "inline-flex h-7 w-9 items-center justify-center rounded text-[var(--color-fg-muted)]",
        "transition-colors hover:text-[var(--color-fg)]",
        danger
          ? "hover:bg-red-500/85 hover:text-white"
          : "hover:bg-[color-mix(in_oklch,var(--color-fg)_10%,transparent)]",
      )}
    >
      {icon}
    </button>
  );
}

function ResizeHandle({
  dir,
  cursor,
  geometry,
  onResize,
}: {
  dir: ResizeDir;
  cursor: string;
  geometry: () => { x: number; y: number; w: number; h: number };
  onResize: (g: { x: number; y: number; w: number; h: number }) => void;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  useResize(ref, dir, { getGeometry: geometry, onResize });

  const base = "absolute";
  const positions: Record<ResizeDir, string> = {
    n: "left-0 right-0 top-0 h-1.5",
    s: "left-0 right-0 bottom-0 h-1.5",
    e: "top-0 bottom-0 right-0 w-1.5",
    w: "top-0 bottom-0 left-0 w-1.5",
    ne: "top-0 right-0 w-3 h-3",
    nw: "top-0 left-0 w-3 h-3",
    se: "bottom-0 right-0 w-3 h-3",
    sw: "bottom-0 left-0 w-3 h-3",
  };
  return (
    <div
      ref={ref}
      data-no-drag
      style={{ cursor }}
      className={cn(base, positions[dir], "z-10")}
      aria-hidden="true"
    />
  );
}

// Re-export the type for convenience.
export type { WindowState };
