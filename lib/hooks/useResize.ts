/**
 * `useResize` — pointer-event based resize hook supporting 8 handles.
 *
 * The hook computes new geometry given the handle direction and a delta from
 * pointer-down. The caller is responsible for clamping (the window store does
 * that). Sends batched `onResize` updates.
 */

import { useEffect, useRef } from "react";

export type ResizeDir =
  | "n"
  | "s"
  | "e"
  | "w"
  | "ne"
  | "nw"
  | "se"
  | "sw";

interface Geometry {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface ResizeHandlers {
  /** Returns the current geometry at pointer-down. Re-read each drag. */
  getGeometry: () => Geometry;
  /** Called with the new desired geometry on every move event. */
  onResize: (geom: Geometry) => void;
  onEnd?: () => void;
  disabled?: boolean;
}

/**
 * Attach to a resize-handle element. The `dir` attribute determines which
 * sides move.
 */
export function useResize(
  ref: React.RefObject<HTMLElement | null>,
  dir: ResizeDir,
  handlers: ResizeHandlers,
) {
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  useEffect(() => {
    const el = ref.current;
    if (!el || handlers.disabled) return;

    let pointerId: number | null = null;
    let startGeom: Geometry | null = null;
    let startX = 0;
    let startY = 0;

    const onDown = (e: PointerEvent) => {
      if (e.button !== 0) return;
      pointerId = e.pointerId;
      startX = e.clientX;
      startY = e.clientY;
      startGeom = handlersRef.current.getGeometry();
      el.setPointerCapture(e.pointerId);
      e.stopPropagation();
    };

    const onMove = (e: PointerEvent) => {
      if (pointerId !== e.pointerId || !startGeom) return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      let { x, y, w, h } = startGeom;
      if (dir.includes("e")) w = startGeom.w + dx;
      if (dir.includes("s")) h = startGeom.h + dy;
      if (dir.includes("w")) {
        w = startGeom.w - dx;
        x = startGeom.x + dx;
      }
      if (dir.includes("n")) {
        h = startGeom.h - dy;
        y = startGeom.y + dy;
      }
      handlersRef.current.onResize({ x, y, w, h });
    };

    const onUp = (e: PointerEvent) => {
      if (pointerId !== e.pointerId) return;
      try {
        el.releasePointerCapture(e.pointerId);
      } catch {
        /* */
      }
      pointerId = null;
      startGeom = null;
      handlersRef.current.onEnd?.();
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
  }, [ref, dir, handlers.disabled]);
}
