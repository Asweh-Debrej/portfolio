"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Settings as SettingsIcon, Volume2, VolumeX, SunMedium, Moon } from "lucide-react";
import { getAppMeta } from "@/lib/registry";
import { useWindowStore } from "@/lib/store/windowStore";
import { useSettingsStore } from "@/lib/store/settingsStore";
import { useSound } from "@/lib/hooks/useSound";
import { useReducedMotion } from "@/lib/hooks/useMediaQuery";
import { TASKBAR_HEIGHT } from "@/lib/store/windowStore";
import { cn } from "@/lib/utils";

interface TaskbarProps {
  onStartClick: () => void;
  startMenuOpen: boolean;
}

/**
 * `<Taskbar>` - bottom strip with Start button, window buttons (one per open
 * window), clock, and tray (theme + sound quick toggles).
 *
 * Window buttons use Framer Motion's `layout` prop + `<AnimatePresence>`
 * for the slide-in/out animation when apps open/close.
 */
export function Taskbar({ onStartClick, startMenuOpen }: TaskbarProps) {
  return (
    <div
      role="toolbar"
      aria-label="Taskbar"
      style={{ height: TASKBAR_HEIGHT, ["--taskbar-h" as string]: `${TASKBAR_HEIGHT}px` }}
      className={cn(
        "fixed inset-x-0 bottom-0 z-[8000] flex items-center gap-1 px-2",
        "border-t border-[var(--color-border)] backdrop-blur-xl",
        "bg-[var(--color-taskbar)]",
      )}
    >
      <StartButton onClick={onStartClick} active={startMenuOpen} />
      <WindowButtons />
      <Tray />
    </div>
  );
}

function StartButton({ onClick, active }: { onClick: () => void; active: boolean }) {
  return (
    <button
      type="button"
      aria-label="Start menu"
      aria-expanded={active}
      onClick={onClick}
      className={cn(
        "inline-flex h-9 w-10 items-center justify-center rounded-md",
        "transition-colors hover:bg-[color-mix(in_oklch,var(--color-fg)_10%,transparent)]",
        active && "bg-[color-mix(in_oklch,var(--color-fg)_12%,transparent)]",
      )}
    >
      {/* Stylised "windows" tile glyph */}
      <span className="grid h-5 w-5 grid-cols-2 grid-rows-2 gap-[2px]">
        <span className="rounded-sm bg-[var(--color-accent)]" />
        <span className="rounded-sm bg-[var(--color-accent)]/85" />
        <span className="rounded-sm bg-[var(--color-accent)]/85" />
        <span className="rounded-sm bg-[var(--color-accent)]/70" />
      </span>
    </button>
  );
}

function WindowButtons() {
  const order = useWindowStore((s) => s.order);
  const windows = useWindowStore((s) => s.windows);
  const focusedId = useWindowStore((s) => s.focusedId);
  const focus = useWindowStore((s) => s.focus);
  const minimize = useWindowStore((s) => s.minimize);
  const close = useWindowStore((s) => s.close);
  const reducedMotion = useReducedMotion();
  const sound = useSound();

  return (
    <div className="flex flex-1 items-center gap-1 overflow-x-auto px-1" data-testid="taskbar-windows">
      <AnimatePresence initial={false}>
        {order.map((id) => {
          const w = windows[id];
          const meta = getAppMeta(id);
          if (!w || !meta) return null;
          const Icon = meta.icon;
          const isFocused = focusedId === id;
          const title = meta.dynamicTitle?.(w.param) ?? meta.title;
          const onClick = () => {
            sound("click");
            if (w.minimized) {
              focus(id);
            } else if (isFocused) {
              minimize(id);
            } else {
              focus(id);
            }
          };
          // Middle-click closes the window - matches taskbar idiom on most
          // desktop OSes. `onAuxClick` fires for any non-primary button; we
          // gate on `button === 1` (middle).
          const onAuxClick = (e: React.MouseEvent) => {
            if (e.button !== 1) return;
            e.preventDefault();
            sound("close");
            close(id);
          };
          return (
            <motion.button
              key={id}
              type="button"
              layout
              initial={reducedMotion ? false : { opacity: 0, x: -8, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={reducedMotion ? { opacity: 0 } : { opacity: 0, x: -8, scale: 0.9 }}
              transition={{ duration: reducedMotion ? 0 : 0.14, ease: "easeOut" }}
              onClick={onClick}
              onAuxClick={onAuxClick}
              aria-pressed={isFocused}
              title={`${title}\u2003\u2014\u2003middle-click to close`}
              className={cn(
                "group inline-flex h-9 max-w-[180px] shrink-0 items-center gap-1.5 rounded-md px-2",
                "text-[12px] text-[var(--color-fg)] transition-colors",
                "border-b-2",
                isFocused
                  ? "border-[var(--color-accent)] bg-[color-mix(in_oklch,var(--color-fg)_10%,transparent)]"
                  : w.minimized
                    ? "border-transparent hover:bg-[color-mix(in_oklch,var(--color-fg)_6%,transparent)]"
                    : "border-[color-mix(in_oklch,var(--color-fg)_15%,transparent)] hover:bg-[color-mix(in_oklch,var(--color-fg)_6%,transparent)]",
              )}
            >
              <Icon size={14} className="shrink-0" />
              <span className="truncate">{title}</span>
            </motion.button>
          );
        })}
      </AnimatePresence>
    </div>
  );
}

function Tray() {
  const sound = useSound();
  const theme = useSettingsStore((s) => s.theme);
  const toggleTheme = useSettingsStore((s) => s.toggleTheme);
  const soundEnabled = useSettingsStore((s) => s.soundEnabled);
  const setSoundEnabled = useSettingsStore((s) => s.setSoundEnabled);
  const open = useWindowStore((s) => s.open);

  return (
    <div className="ml-auto flex items-center gap-0.5">
      <TrayButton
        label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
        onClick={() => {
          sound("click");
          toggleTheme();
        }}
      >
        {theme === "dark" ? <SunMedium size={16} /> : <Moon size={16} />}
      </TrayButton>
      <TrayButton
        label={soundEnabled ? "Mute UI sounds" : "Unmute UI sounds"}
        onClick={() => {
          setSoundEnabled(!soundEnabled);
        }}
      >
        {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
      </TrayButton>
      <TrayButton
        label="Open settings"
        onClick={() => {
          sound("open");
          const meta = getAppMeta("settings");
          open("settings", { defaultSize: meta?.defaultSize });
        }}
      >
        <SettingsIcon size={16} />
      </TrayButton>
      <Clock />
    </div>
  );
}

function TrayButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className={cn(
        "inline-flex h-9 w-9 items-center justify-center rounded-md text-[var(--color-fg-muted)]",
        "transition-colors hover:bg-[color-mix(in_oklch,var(--color-fg)_10%,transparent)] hover:text-[var(--color-fg)]",
      )}
    >
      {children}
    </button>
  );
}

function Clock() {
  // Avoid hydration mismatch: server renders a stable placeholder, then the
  // client swaps in the real time after mount. Without this, the SSR HTML
  // (rendered at build time = stale clock value) differs from the first
  // client render and React warns / hydration desyncs the whole tree.
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    // Re-render at minute boundary, not every second (saves work).
    let timer: ReturnType<typeof setTimeout>;
    const schedule = () => {
      const next = 60000 - (Date.now() % 60000);
      timer = setTimeout(() => {
        setNow(new Date());
        schedule();
      }, next);
    };
    schedule();
    return () => clearTimeout(timer);
  }, []);

  const time = now
    ? now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : "--:--";
  const date = now
    ? now.toLocaleDateString([], { day: "2-digit", month: "short" })
    : "\u00A0"; // non-breaking space keeps the row height stable

  return (
    <div
      className="ml-1 flex h-9 items-center px-2 text-right text-[11px] leading-tight text-[var(--color-fg-muted)]"
      aria-label={now ? `Current time: ${time}, ${date}` : "Loading clock"}
    >
      <span>
        <span className="block">{time}</span>
        <span className="block">{date}</span>
      </span>
    </div>
  );
}

// Re-export for callers (avoid magic numbers).
export { TASKBAR_HEIGHT };
