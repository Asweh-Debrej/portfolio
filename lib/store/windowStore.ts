/**
 * Window manager state.
 *
 * Design notes
 * ------------
 * - One window per app id at most. Re-opening an already-open window just
 *   focuses it (and updates `param` if provided). This matches Windows / macOS
 *   single-instance behaviour for most built-in apps.
 *   Exception: `project-viewer` is a single-instance window whose content
 *   varies by `param` (the project slug). Switching project = changing `param`
 *   on the same window, no spawn cost.
 *
 * - Z-index is a monotonically increasing counter. On focus, we hand the window
 *   the next number. We never re-compact (cheap; integers are unbounded for our
 *   purposes — millions of focus events fit in a Number).
 *
 * - `order` records open order; we use it for Alt+Tab-style cycling and to find
 *   "next window to focus" when one closes.
 *
 * - Transient drag-preview state (snap hints) lives here too, but is excluded
 *   from persistence via `partialize`.
 *
 * - `clampToViewport` is called after rehydration and on window resize so
 *   persisted geometry from a larger screen never renders off-canvas.
 */

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { clamp } from "@/lib/utils";

export const TASKBAR_HEIGHT = 48;
export const WINDOW_HEADER_HEIGHT = 36;
export const MIN_W = 320;
export const MIN_H = 220;
export const DRAG_VISIBLE_MARGIN = 80; // keep at least this much window visible while dragging

export type SnapSide = "left" | "right" | "max" | null;

export interface WindowState {
  /** Matches `AppMeta.id` from the registry (single-instance per app). */
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  minimized: boolean;
  maximized: boolean;
  zIndex: number;
  /** Pre-maximize / pre-snap geometry for restoration. */
  restore?: { x: number; y: number; w: number; h: number };
  /** App-specific argument (e.g., project slug for `project-viewer`). */
  param?: string;
}

interface DragPreview {
  side: SnapSide;
  visible: boolean;
}

export interface WindowStore {
  windows: Record<string, WindowState>;
  /** Open order; first = oldest. Closed windows are removed. */
  order: string[];
  focusedId: string | null;
  /** Monotonic z-index allocator. */
  zCounter: number;
  /** Transient drag snap hint (not persisted). */
  dragPreview: DragPreview;
  /** True once persist has rehydrated; gates client-only renders. */
  hydrated: boolean;

  // ----- Actions ---------------------------------------------------------
  open: (
    id: string,
    opts?: { param?: string; defaultSize?: { w: number; h: number } },
  ) => void;
  close: (id: string) => void;
  closeAll: () => void;
  focus: (id: string) => void;
  minimize: (id: string) => void;
  restoreFromMinimize: (id: string) => void;
  toggleMax: (id: string) => void;
  /**
   * Restore a maximized window mid-drag so the cursor stays anchored to the
   * header. Used when the user grabs a maximized window's header — Windows
   * 7+ idiom. `cursorX/Y` are viewport coordinates of the pointer.
   *
   * Returns the new `{x, y}` so the caller (drag hook) can re-anchor its
   * origin without an extra store read.
   */
  restoreFromMaxAt: (
    id: string,
    cursorX: number,
    cursorY: number,
  ) => { x: number; y: number } | null;
  move: (id: string, x: number, y: number) => void;
  resize: (
    id: string,
    w: number,
    h: number,
    x?: number,
    y?: number,
  ) => void;
  setParam: (id: string, param: string | undefined) => void;
  setDragPreview: (preview: DragPreview) => void;
  applySnap: (id: string, side: SnapSide) => void;
  cycleFocus: (direction: 1 | -1) => void;
  clampToViewport: (vw: number, vh: number) => void;
  /** Internal: invoked once by the persist `onRehydrateStorage`. */
  _markHydrated: () => void;
}

/**
 * Cascade default position: each successive open offsets a bit so windows
 * don't perfectly stack. Wraps after 6 to avoid drifting off-screen.
 */
function defaultPosition(
  count: number,
  vw: number,
  vh: number,
  size: { w: number; h: number },
) {
  const cascadeStep = 24;
  const i = count % 6;
  const baseX = Math.max(40, Math.round(vw / 2 - size.w / 2));
  const baseY = Math.max(40, Math.round(vh / 2 - size.h / 2 - 24));
  return {
    x: clamp(baseX + i * cascadeStep, 20, vw - size.w - 20),
    y: clamp(baseY + i * cascadeStep, 20, vh - size.h - TASKBAR_HEIGHT - 20),
  };
}

function viewport() {
  if (typeof window === "undefined") return { vw: 1280, vh: 720 };
  return { vw: window.innerWidth, vh: window.innerHeight };
}

/**
 * Bound a single window inside the current viewport (taskbar reserved).
 * Used on rehydrate and on window-resize.
 */
function clampWindow(w: WindowState, vw: number, vh: number): WindowState {
  const maxBody = vh - TASKBAR_HEIGHT;
  const width = clamp(w.w, MIN_W, vw - 20);
  const height = clamp(w.h, MIN_H, maxBody - 20);
  // Allow partial off-screen but keep handle reachable.
  const x = clamp(w.x, -width + DRAG_VISIBLE_MARGIN, vw - DRAG_VISIBLE_MARGIN);
  const y = clamp(w.y, 0, Math.max(0, maxBody - WINDOW_HEADER_HEIGHT));
  return { ...w, w: width, h: height, x, y };
}

export const useWindowStore = create<WindowStore>()(
  persist(
    (set, get) => ({
      windows: {},
      order: [],
      focusedId: null,
      zCounter: 1,
      dragPreview: { side: null, visible: false },
      hydrated: false,

      open: (id, opts) => {
        const state = get();
        const existing = state.windows[id];
        if (existing) {
          // Re-focus & possibly update `param`.
          set((s) => ({
            windows: {
              ...s.windows,
              [id]: {
                ...existing,
                minimized: false,
                zIndex: s.zCounter + 1,
                param: opts?.param ?? existing.param,
              },
            },
            focusedId: id,
            zCounter: s.zCounter + 1,
          }));
          return;
        }
        const { vw, vh } = viewport();
        const size = opts?.defaultSize ?? { w: 720, h: 480 };
        const safeW = Math.min(size.w, Math.max(MIN_W, vw - 40));
        const safeH = Math.min(size.h, Math.max(MIN_H, vh - TASKBAR_HEIGHT - 40));
        const pos = defaultPosition(state.order.length, vw, vh, {
          w: safeW,
          h: safeH,
        });
        const newWindow: WindowState = {
          id,
          x: pos.x,
          y: pos.y,
          w: safeW,
          h: safeH,
          minimized: false,
          maximized: false,
          zIndex: state.zCounter + 1,
          param: opts?.param,
        };
        set((s) => ({
          windows: { ...s.windows, [id]: newWindow },
          order: [...s.order, id],
          focusedId: id,
          zCounter: s.zCounter + 1,
        }));
      },

      close: (id) => {
        set((s) => {
          const next = { ...s.windows };
          delete next[id];
          const nextOrder = s.order.filter((wid) => wid !== id);
          // Find next focus candidate: top-z non-minimized window.
          const candidates = nextOrder
            .map((wid) => next[wid])
            .filter((w) => w && !w.minimized);
          const newFocus =
            candidates.length > 0
              ? candidates.reduce((a, b) => (a.zIndex > b.zIndex ? a : b)).id
              : null;
          return { windows: next, order: nextOrder, focusedId: newFocus };
        });
      },

      closeAll: () =>
        set({
          windows: {},
          order: [],
          focusedId: null,
        }),

      focus: (id) => {
        const w = get().windows[id];
        if (!w) return;
        set((s) => ({
          windows: {
            ...s.windows,
            [id]: { ...w, minimized: false, zIndex: s.zCounter + 1 },
          },
          focusedId: id,
          zCounter: s.zCounter + 1,
        }));
      },

      minimize: (id) => {
        const w = get().windows[id];
        if (!w) return;
        set((s) => {
          // Pick next focus = top non-minimized & not this one.
          const candidates = s.order
            .map((wid) => s.windows[wid])
            .filter((cw) => cw && cw.id !== id && !cw.minimized);
          const newFocus =
            candidates.length > 0
              ? candidates.reduce((a, b) => (a.zIndex > b.zIndex ? a : b)).id
              : null;
          return {
            windows: { ...s.windows, [id]: { ...w, minimized: true } },
            focusedId: s.focusedId === id ? newFocus : s.focusedId,
          };
        });
      },

      restoreFromMinimize: (id) => {
        get().focus(id);
      },

      toggleMax: (id) => {
        const w = get().windows[id];
        if (!w) return;
        if (w.maximized && w.restore) {
          set((s) => ({
            windows: {
              ...s.windows,
              [id]: {
                ...w,
                maximized: false,
                x: w.restore!.x,
                y: w.restore!.y,
                w: w.restore!.w,
                h: w.restore!.h,
                restore: undefined,
              },
            },
          }));
        } else {
          const { vw, vh } = viewport();
          set((s) => ({
            windows: {
              ...s.windows,
              [id]: {
                ...w,
                restore: { x: w.x, y: w.y, w: w.w, h: w.h },
                maximized: true,
                x: 0,
                y: 0,
                w: vw,
                h: vh - TASKBAR_HEIGHT,
              },
            },
          }));
        }
      },

      restoreFromMaxAt: (id, cursorX, cursorY) => {
        const w = get().windows[id];
        if (!w || !w.maximized) return null;
        // Use the saved restore geometry if it exists, otherwise pick a sane
        // default (60% of viewport). This handles edge case: someone called
        // maximize without snap so `restore` is set; or first-open default.
        const { vw, vh } = viewport();
        const restored = w.restore ?? {
          x: 0,
          y: 0,
          w: Math.max(MIN_W, Math.round(vw * 0.6)),
          h: Math.max(MIN_H, Math.round((vh - TASKBAR_HEIGHT) * 0.7)),
        };
        // Anchor the header to the cursor. The cursor falls at the same
        // proportional X within the restored width as it was within the
        // maximized width. Y is set so the cursor sits inside the header.
        const ratioX = clamp(cursorX / Math.max(1, vw), 0, 1);
        const newX = clamp(
          Math.round(cursorX - ratioX * restored.w),
          -restored.w + DRAG_VISIBLE_MARGIN,
          vw - DRAG_VISIBLE_MARGIN,
        );
        const newY = clamp(
          Math.round(cursorY - WINDOW_HEADER_HEIGHT / 2),
          0,
          Math.max(0, vh - TASKBAR_HEIGHT - WINDOW_HEADER_HEIGHT),
        );
        set((s) => ({
          windows: {
            ...s.windows,
            [id]: {
              ...w,
              maximized: false,
              x: newX,
              y: newY,
              w: restored.w,
              h: restored.h,
              restore: undefined,
            },
          },
        }));
        return { x: newX, y: newY };
      },

      move: (id, x, y) => {
        const w = get().windows[id];
        if (!w || w.maximized) return;
        const { vw, vh } = viewport();
        const cx = clamp(x, -w.w + DRAG_VISIBLE_MARGIN, vw - DRAG_VISIBLE_MARGIN);
        const cy = clamp(y, 0, Math.max(0, vh - TASKBAR_HEIGHT - WINDOW_HEADER_HEIGHT));
        set((s) => ({
          windows: { ...s.windows, [id]: { ...w, x: cx, y: cy } },
        }));
      },

      resize: (id, w, h, x, y) => {
        const win = get().windows[id];
        if (!win || win.maximized) return;
        const { vw, vh } = viewport();
        const newW = clamp(w, MIN_W, vw);
        const newH = clamp(h, MIN_H, vh - TASKBAR_HEIGHT);
        set((s) => ({
          windows: {
            ...s.windows,
            [id]: {
              ...win,
              w: newW,
              h: newH,
              x: x !== undefined ? clamp(x, -newW + DRAG_VISIBLE_MARGIN, vw - DRAG_VISIBLE_MARGIN) : win.x,
              y: y !== undefined ? clamp(y, 0, vh - TASKBAR_HEIGHT - WINDOW_HEADER_HEIGHT) : win.y,
            },
          },
        }));
      },

      setParam: (id, param) => {
        const w = get().windows[id];
        if (!w) return;
        set((s) => ({
          windows: { ...s.windows, [id]: { ...w, param } },
        }));
      },

      setDragPreview: (preview) => set({ dragPreview: preview }),

      applySnap: (id, side) => {
        const w = get().windows[id];
        if (!w || !side) return;
        const { vw, vh } = viewport();
        const usable = vh - TASKBAR_HEIGHT;
        const restore = w.restore ?? { x: w.x, y: w.y, w: w.w, h: w.h };
        let geom: { x: number; y: number; w: number; h: number };
        if (side === "left") {
          geom = { x: 0, y: 0, w: Math.floor(vw / 2), h: usable };
        } else if (side === "right") {
          geom = {
            x: Math.ceil(vw / 2),
            y: 0,
            w: Math.floor(vw / 2),
            h: usable,
          };
        } else {
          geom = { x: 0, y: 0, w: vw, h: usable };
        }
        set((s) => ({
          windows: {
            ...s.windows,
            [id]: {
              ...w,
              ...geom,
              maximized: side === "max",
              restore,
            },
          },
          dragPreview: { side: null, visible: false },
        }));
      },

      cycleFocus: (direction) => {
        const s = get();
        const open = s.order
          .map((id) => s.windows[id])
          .filter((w): w is WindowState => !!w && !w.minimized);
        if (open.length === 0) return;
        const sorted = [...open].sort((a, b) => a.zIndex - b.zIndex);
        const currentIdx = sorted.findIndex((w) => w.id === s.focusedId);
        const nextIdx =
          currentIdx < 0
            ? 0
            : (currentIdx + direction + sorted.length) % sorted.length;
        s.focus(sorted[nextIdx].id);
      },

      clampToViewport: (vw, vh) => {
        set((s) => {
          const next: Record<string, WindowState> = {};
          for (const id of Object.keys(s.windows)) {
            const w = s.windows[id];
            if (w.maximized) {
              next[id] = { ...w, x: 0, y: 0, w: vw, h: vh - TASKBAR_HEIGHT };
            } else {
              next[id] = clampWindow(w, vw, vh);
            }
          }
          return { windows: next };
        });
      },

      _markHydrated: () => set({ hydrated: true }),
    }),
    {
      name: "aan:windows",
      version: 1,
      storage: createJSONStorage(() => localStorage),
      // Don't persist transient UI state.
      partialize: (state) => ({
        windows: state.windows,
        order: state.order,
        focusedId: state.focusedId,
        zCounter: state.zCounter,
      }),
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        // Clamp persisted geometry to current viewport.
        if (typeof window !== "undefined") {
          state.clampToViewport(window.innerWidth, window.innerHeight);
        }
        state._markHydrated();
      },
    },
  ),
);
