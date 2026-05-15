"use client";

import { AnimatePresence, motion } from "motion/react";
import { useShallow } from "zustand/react/shallow";
import { useWindowStore } from "@/lib/store/windowStore";
import { useReducedMotion } from "@/lib/hooks/useMediaQuery";
import { Window } from "./Window";
import { getAppMeta } from "@/lib/registry";
import { cn } from "@/lib/utils";

/**
 * `<WindowManager>` â€” renders every open (non-minimized) window plus the
 * drag-snap preview overlay.
 *
 * Perf contract
 * -------------
 * The manager subscribes only to `visibleIds` (shallow-compared array) and
 * `dragPreview`. Window geometry/zIndex updates do **not** re-run this
 * component â€” each `<Window id={id} />` subscribes to its own slice.
 * Combined with `Window` being `memo`'d, a single window drag triggers zero
 * sibling renders.
 */
export function WindowManager() {
  // Stable identity unless the open/minimized set actually changes.
  const visibleIds = useWindowStore(
    useShallow((s) =>
      s.order.filter((id) => s.windows[id] && !s.windows[id].minimized),
    ),
  );
  const dragPreview = useWindowStore((s) => s.dragPreview);
  const hydrated = useWindowStore((s) => s.hydrated);
  const reducedMotion = useReducedMotion();

  // Avoid spawning windows that depend on persisted geometry before hydrate.
  if (!hydrated) return null;

  return (
    <>
      <AnimatePresence>
        {visibleIds.map((id) => (
          <WindowSlot key={id} id={id} />
        ))}
      </AnimatePresence>
      <AnimatePresence>
        {dragPreview.visible && dragPreview.side && (
          <SnapPreview side={dragPreview.side} reducedMotion={reducedMotion} />
        )}
      </AnimatePresence>
    </>
  );
}

/**
 * Reads the per-window `param` (the only dynamic input to dynamicTitle &
 * the app component) without forcing `WindowManager` to subscribe to the
 * whole `windows` map.
 */
function WindowSlot({ id }: { id: string }) {
  const param = useWindowStore((s) => s.windows[id]?.param);
  const exists = useWindowStore((s) => !!s.windows[id]);
  if (!exists) return null;
  const meta = getAppMeta(id);
  if (!meta) return null;
  const Component = meta.component;
  const Icon = meta.icon;
  const title = meta.dynamicTitle?.(param) ?? meta.title;
  return (
    <Window id={id} title={title} icon={<Icon size={14} />}>
      <Component param={param} />
    </Window>
  );
}

function SnapPreview({
  side,
  reducedMotion,
}: {
  side: NonNullable<ReturnType<typeof useWindowStore.getState>["dragPreview"]["side"]>;
  reducedMotion: boolean;
}) {
  const style =
    side === "left"
      ? { left: 0, top: 0, width: "50%", height: "calc(100% - 48px)" }
      : side === "right"
        ? { right: 0, top: 0, width: "50%", height: "calc(100% - 48px)" }
        : { left: 0, top: 0, width: "100%", height: "calc(100% - 48px)" };
  return (
    <motion.div
      role="presentation"
      aria-hidden="true"
      initial={reducedMotion ? { opacity: 0.4 } : { opacity: 0 }}
      animate={{ opacity: 0.5 }}
      exit={{ opacity: 0 }}
      transition={{ duration: reducedMotion ? 0 : 0.1 }}
      style={style}
      className={cn(
        "pointer-events-none fixed z-[9000] rounded-lg",
        "border-2 border-[var(--color-accent)] bg-[var(--color-accent)]/15",
        "backdrop-blur-sm",
      )}
    />
  );
}

