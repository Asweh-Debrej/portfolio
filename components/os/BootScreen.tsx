"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useSettingsStore } from "@/lib/store/settingsStore";
import { useReducedMotion } from "@/lib/hooks/useMediaQuery";

/**
 * `<BootScreen>` — first-visit only. Shows a brief "booting…" splash, then
 * sets `hasSeenBoot=true` so subsequent loads go straight to the desktop.
 *
 * - Reduced-motion users get a static screen for ~600ms (instead of animation).
 * - Skippable with any key / pointer click.
 */
export function BootScreen() {
  const hasSeenBoot = useSettingsStore((s) => s.hasSeenBoot);
  const markSeen = useSettingsStore((s) => s.markBootSeen);
  const hydrated = useSettingsStore((s) => s.hydrated);
  const reducedMotion = useReducedMotion();
  const [show, setShow] = useState(true);

  useEffect(() => {
    if (!hydrated) return;
    if (hasSeenBoot) {
      setShow(false);
      return;
    }
    const duration = reducedMotion ? 600 : 1500;
    const t = setTimeout(() => {
      markSeen();
      setShow(false);
    }, duration);
    const skip = () => {
      markSeen();
      setShow(false);
    };
    window.addEventListener("keydown", skip, { once: true });
    window.addEventListener("pointerdown", skip, { once: true });
    return () => {
      clearTimeout(t);
      window.removeEventListener("keydown", skip);
      window.removeEventListener("pointerdown", skip);
    };
  }, [hydrated, hasSeenBoot, markSeen, reducedMotion]);

  return (
    <AnimatePresence>
      {/* Cover the screen while hydration is pending OR during first-boot animation.
          Without this, the desktop flashes for one render cycle before the store
          hydrates and the condition would have been gated on `hydrated`. */}
      {show && (!hydrated || !hasSeenBoot) && (
        <motion.div
          role="status"
          aria-label="Booting Aan OS"
          initial={{ opacity: 1 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4 }}
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-center gap-6 bg-black text-white"
        >
          {/* Render animation content only after hydration (first visit).
              Pre-hydration: plain black cover — no animated elements yet. */}
          {hydrated && !hasSeenBoot && (
            <>
              <motion.div
                initial={reducedMotion ? { opacity: 1 } : { opacity: 0, scale: 0.92 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: reducedMotion ? 0 : 0.5, ease: "easeOut" }}
                className="flex flex-col items-center gap-3"
              >
                <span className="grid h-14 w-14 grid-cols-2 grid-rows-2 gap-1">
                  <span className="rounded bg-[var(--color-accent)]" />
                  <span className="rounded bg-[var(--color-accent)]/80" />
                  <span className="rounded bg-[var(--color-accent)]/80" />
                  <span className="rounded bg-[var(--color-accent)]/60" />
                </span>
                <p className="text-lg font-medium tracking-wide">aan os</p>
              </motion.div>
              <div
                className="h-1 w-44 overflow-hidden rounded-full bg-white/15"
                aria-hidden="true"
              >
                <motion.div
                  initial={{ x: "-100%" }}
                  animate={{ x: "100%" }}
                  transition={{
                    duration: reducedMotion ? 0 : 1.2,
                    repeat: reducedMotion ? 0 : Infinity,
                    ease: "easeInOut",
                  }}
                  className="h-full w-1/2 rounded-full bg-[var(--color-accent)]"
                />
              </div>
              <p className="text-xs text-white/50">press any key to skip</p>
            </>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
