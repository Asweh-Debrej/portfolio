"use client";

import { useEffect, useRef } from "react";
import { useSettingsStore } from "@/lib/store/settingsStore";
import { useIsMobile, useReducedMotion } from "@/lib/hooks/useMediaQuery";
import { cn } from "@/lib/utils";

const CLASS_BY_ID: Record<string, string> = {
  aurora: "wallpaper-aurora",
  sunset: "wallpaper-sunset",
  forest: "wallpaper-forest",
};

/**
 * `<Wallpaper>` — animated CSS-gradient background with optional pointer
 * parallax. Heavy filters are scoped to a `<div>` (not body) so React rules
 * don't conflict with the gradient.
 */
export function Wallpaper() {
  const wallpaper = useSettingsStore((s) => s.wallpaper);
  const parallaxEnabled = useSettingsStore((s) => s.parallaxEnabled);
  const reducedMotion = useReducedMotion();
  const isMobile = useIsMobile();
  const ref = useRef<HTMLDivElement | null>(null);

  // Pointer parallax — RAF-throttled, no React re-renders.
  useEffect(() => {
    if (!parallaxEnabled || reducedMotion || isMobile) return;
    const el = ref.current;
    if (!el) return;
    let raf = 0;
    let tx = 0;
    let ty = 0;
    let pending = false;

    const onMove = (e: PointerEvent) => {
      // Range ~ ±2% of viewport, very subtle.
      tx = (e.clientX / window.innerWidth - 0.5) * 30; // px
      ty = (e.clientY / window.innerHeight - 0.5) * 20;
      if (!pending) {
        pending = true;
        raf = requestAnimationFrame(() => {
          pending = false;
          el.style.setProperty("--parallax-x", `${tx.toFixed(1)}px`);
          el.style.setProperty("--parallax-y", `${ty.toFixed(1)}px`);
        });
      }
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      window.removeEventListener("pointermove", onMove);
      cancelAnimationFrame(raf);
    };
  }, [parallaxEnabled, reducedMotion, isMobile]);

  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      {/* Parallax layer — transforms with pointer movement.
          Kept separate from the drift-animation div so the two
          `transform` declarations never conflict. */}
      <div
        ref={ref}
        style={{
          position: "absolute",
          inset: 0,
          transform: "translate3d(var(--parallax-x, 0px), var(--parallax-y, 0px), 0)",
          transition: "transform 0.4s cubic-bezier(0.2, 0.8, 0.2, 1)",
        }}
      >
        {/* Drift-animation layer */}
        <div className={cn(CLASS_BY_ID[wallpaper] ?? CLASS_BY_ID.aurora)} />
      </div>
    </div>
  );
}
