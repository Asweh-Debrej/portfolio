/**
 * `useDrag` — pointer-event based drag with optional snap-to-edge detection.
 *
 * The hook is decoupled from any store: it only emits raw delta events.
 * Callers translate deltas into transforms (cheap, no React re-render) or
 * commit them to a store at `onEnd`.
 *
 * Snap-side detection (window-manager-specific) is performed during drag and
 * exposed via `onSnapChange`. Pass `disableSnap: true` for non-window dragees
 * (e.g. desktop icons) to skip the edge checks entirely.
 *
 * Edge thresholds use absolute pixels (more predictable than %).
 *
 * Compositor-only drag pattern
 * ----------------------------
 * `onStart` receives the initial cursor position; `onMove` receives delta
 * AND live cursor coordinates. Idiomatic usage in `<Window>`:
 *
 *   onStart: ({ cursorX }) => { originRef.current = readGeom(); }
 *   onMove: ({ dx, dy }) => { el.style.transform = `translate3d(${dx}px,${dy}px,0)` }
 *   onEnd:  ({ snap }) => { commit to store, clear inline transform }
 *
 * No React renders during drag → buttery 120fps.
 */

import { useEffect, useRef } from "react";

const SNAP_THRESHOLD = 24;

export type DragSnapSide = "left" | "right" | "max" | null;

export interface DragStartInfo {
  cursorX: number;
  cursorY: number;
}

export interface DragMoveInfo {
  dx: number;
  dy: number;
  cursorX: number;
  cursorY: number;
}

export interface DragEndInfo {
  /** Last computed snap side (always `null` if `disableSnap` was true). */
  snap: DragSnapSide;
  /** Total delta from drag start. */
  dx: number;
  dy: number;
  /** `true` if the user actually moved past the 2px threshold. */
  moved: boolean;
}

export interface DragHandlers {
  /**
   * Called once when the user pressed and started moving (after a 2 px
   * threshold). Receives the cursor position at the moment drag begins.
   */
  onStart?: (info: DragStartInfo) => void;
  /**
   * Called every move event with delta + live cursor position. Use
   * `cursorX/Y` to compute snap zones based on cursor location.
   */
  onMove: (info: DragMoveInfo) => void;
  /** Called once on pointer-up / cancel. */
  onEnd?: (info: DragEndInfo) => void;
  /** Optional: emit snap hint as cursor crosses thresholds during drag. */
  onSnapChange?: (snap: DragSnapSide) => void;
  /** Disable the hook entirely. */
  disabled?: boolean;
  /** Skip viewport-edge snap detection (e.g. for desktop icons). */
  disableSnap?: boolean;
}

export function useDrag(
  ref: React.RefObject<HTMLElement | null>,
  handlers: DragHandlers,
) {
  // Stable handlers reference via ref — lets callers pass inline arrow fns
  // without retriggering the effect.
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  useEffect(() => {
    const el = ref.current;
    if (!el || handlers.disabled) return;
    const skipSnap = handlers.disableSnap === true;

    let pointerId: number | null = null;
    let startX = 0;
    let startY = 0;
    let lastSnap: DragSnapSide = null;
    let started = false;

    const computeSnap = (px: number, py: number): DragSnapSide => {
      if (py <= SNAP_THRESHOLD) return "max";
      if (px <= SNAP_THRESHOLD) return "left";
      if (px >= window.innerWidth - SNAP_THRESHOLD) return "right";
      return null;
    };

    const onDown = (e: PointerEvent) => {
      // Only primary button.
      if (e.button !== 0) return;
      // Don't start drag from interactive children (buttons, links).
      const target = e.target as HTMLElement;
      if (target.closest("[data-no-drag]")) return;
      pointerId = e.pointerId;
      startX = e.clientX;
      startY = e.clientY;
      started = false;
      el.setPointerCapture(e.pointerId);
    };

    const onMove = (e: PointerEvent) => {
      if (pointerId !== e.pointerId) return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      if (!started) {
        // 2 px threshold avoids accidental drag on click.
        if (Math.abs(dx) < 2 && Math.abs(dy) < 2) return;
        started = true;
        handlersRef.current.onStart?.({ cursorX: e.clientX, cursorY: e.clientY });
      }
      handlersRef.current.onMove({
        dx,
        dy,
        cursorX: e.clientX,
        cursorY: e.clientY,
      });
      if (!skipSnap) {
        const snap = computeSnap(e.clientX, e.clientY);
        if (snap !== lastSnap) {
          lastSnap = snap;
          handlersRef.current.onSnapChange?.(snap);
        }
      }
    };

    const onUp = (e: PointerEvent) => {
      if (pointerId !== e.pointerId) return;
      try {
        el.releasePointerCapture(e.pointerId);
      } catch {
        /* already released */
      }
      pointerId = null;
      const finalDx = e.clientX - startX;
      const finalDy = e.clientY - startY;
      const moved = started;
      handlersRef.current.onEnd?.({
        snap: lastSnap,
        dx: finalDx,
        dy: finalDy,
        moved,
      });
      started = false;
      lastSnap = null;
    };

    el.addEventListener("pointerdown", onDown);
    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerup", onUp);
    el.addEventListener("pointercancel", onUp);
    return () => {
      el.removeEventListener("pointerdown", onDown);
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerup", onUp);
      el.removeEventListener("pointercancel", onUp);
    };
  }, [ref, handlers.disabled, handlers.disableSnap]);
}

export { SNAP_THRESHOLD };
