"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Wallpaper } from "./Wallpaper";
import { Taskbar } from "./Taskbar";
import { StartMenu } from "./StartMenu";
import { WindowManager } from "./WindowManager";
import { BootScreen } from "./BootScreen";
import { DesktopIcon } from "./DesktopIcon";
import { ContextMenu, type MenuItem } from "./ContextMenu";
import { MobileLayout } from "./MobileLayout";
import { useKeyboardShortcuts } from "@/lib/hooks/useKeyboardShortcuts";
import { useKonami } from "@/lib/hooks/useKonami";
import { useWindowStore } from "@/lib/store/windowStore";
import {
  useSettingsStore,
  WALLPAPERS,
  type DesktopIconPos,
} from "@/lib/store/settingsStore";
import { listDesktopShortcuts, getAppMeta } from "@/lib/registry";
import { cn } from "@/lib/utils";

/** Stable hash for a grid cell, used as a Set key for occupancy checks. */
const key = (col: number, row: number) => `${col},${row}`;

interface DesktopRootProps {
  /** App id to auto-open after hydration. Comes from route component. */
  autoOpen?: { id: string; param?: string };
}

/**
 * `<DesktopRoot>` — the entire OS shell. Composes wallpaper + desktop icons +
 * taskbar + start menu + window manager + boot screen + global shortcuts.
 *
 * Mobile fallback
 * ---------------
 * Renders both the desktop shell and `<MobileLayout>` server-side; CSS
 * `md:` breakpoint swaps visibility. This keeps SSR output deterministic
 * regardless of user agent.
 */
export function DesktopRoot({ autoOpen }: DesktopRootProps) {
  const [startMenuOpen, setStartMenuOpen] = useState(false);
  const [crtMode, setCrtMode] = useState(false);
  const open = useWindowStore((s) => s.open);
  const clampToViewport = useWindowStore((s) => s.clampToViewport);
  const hydratedWindows = useWindowStore((s) => s.hydrated);
  const wallpaper = useSettingsStore((s) => s.wallpaper);
  const setWallpaper = useSettingsStore((s) => s.setWallpaper);
  const desktopIconPositions = useSettingsStore((s) => s.desktopIconPositions);
  const resetIconPositions = useSettingsStore((s) => s.resetIconPositions);
  const setIconPositions = useSettingsStore((s) => s.setIconPositions);
  const desktopRef = useRef<HTMLDivElement | null>(null);

  // Global keyboard shortcuts.
  useKeyboardShortcuts({ onStartMenu: () => setStartMenuOpen((v) => !v) });

  // Konami code → toggle CRT visual easter-egg.
  useKonami(() => setCrtMode((v) => !v));

  // Auto-open from route on first hydrate.
  useEffect(() => {
    if (!hydratedWindows || !autoOpen) return;
    const meta = getAppMeta(autoOpen.id);
    if (!meta) return;
    open(autoOpen.id, { param: autoOpen.param, defaultSize: meta.defaultSize });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydratedWindows, autoOpen?.id, autoOpen?.param]);

  // Re-clamp on viewport resize.
  useEffect(() => {
    if (!hydratedWindows) return;
    const onResize = () => clampToViewport(window.innerWidth, window.innerHeight);
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [hydratedWindows, clampToViewport]);

  const desktopContextItems: MenuItem[] = [
    {
      label: "Change wallpaper",
      icon: null,
      separator: false,
      onSelect: () => {
        // Cycle to next wallpaper.
        const idx = WALLPAPERS.findIndex((w) => w.id === wallpaper);
        const next = WALLPAPERS[(idx + 1) % WALLPAPERS.length];
        setWallpaper(next.id);
      },
      shortcut: WALLPAPERS.find((w) => w.id === wallpaper)?.name,
    },
    { separator: true, label: "" },
    {
      label: "Open Settings",
      onSelect: () => {
        const meta = getAppMeta("settings");
        open("settings", { defaultSize: meta?.defaultSize });
      },
    },
    {
      label: "Auto-arrange icons",
      onSelect: () => resetIconPositions(),
    },
    {
      label: "Show desktop",
      onSelect: () => {
        const s = useWindowStore.getState();
        for (const id of s.order) if (!s.windows[id].minimized) s.minimize(id);
      },
      shortcut: "Ctrl+Shift+D",
    },
  ];

  const shortcuts = listDesktopShortcuts();

  /**
   * Compute an effective `{col, row}` for every shortcut.
   *
   * Order of precedence:
   * 1. User-arranged position from `desktopIconPositions`.
   * 2. Otherwise auto-assigned column-first into the first free cell.
   *
   * Auto-assignment uses a fixed max row (`AUTO_ARRANGE_MAX_ROW`) so the icons
   * wrap into a second column instead of falling off the bottom on short
   * viewports.
   */
  const arrangedPositions = useMemo(() => {
    const AUTO_ARRANGE_MAX_ROW = 7;
    const taken = new Set<string>();
    const positions = new Map<string, DesktopIconPos>();
    // First pass: honor stored positions.
    for (const app of shortcuts) {
      const stored = desktopIconPositions[app.id];
      if (stored && !taken.has(key(stored.col, stored.row))) {
        positions.set(app.id, stored);
        taken.add(key(stored.col, stored.row));
      }
    }
    // Second pass: place the rest.
    for (const app of shortcuts) {
      if (positions.has(app.id)) continue;
      // Try the stored slot first even if "taken" — collision case — but
      // we already skipped it, so find next free cell.
      let col = 0;
      let row = 0;
      // Column-fill: walk down each column.
      // Cap at a generous upper bound for safety.
      const SAFE_CAP = 256;
      let placed = false;
      while (col < SAFE_CAP && !placed) {
        if (!taken.has(key(col, row))) {
          positions.set(app.id, { col, row });
          taken.add(key(col, row));
          placed = true;
          break;
        }
        row += 1;
        if (row > AUTO_ARRANGE_MAX_ROW) {
          col += 1;
          row = 0;
        }
      }
    }
    return positions;
  }, [shortcuts, desktopIconPositions]);

  /**
   * Commit a drag-drop: resolve the target cell for the dragged icon, then
   * persist ALL currently-computed positions in one atomic update. This
   * prevents auto-placed icons (those without a stored position) from
   * shuffling into the vacated cell and jumping around.
   */
  const commitDrop = useCallback(
    (id: string, col: number, row: number): void => {
      // Build "taken" set from every icon except the one being moved.
      const taken = new Set<string>();
      for (const app of shortcuts) {
        if (app.id === id) continue;
        const p = arrangedPositions.get(app.id);
        if (p) taken.add(key(p.col, p.row));
      }
      // Find the nearest free cell for the dragged icon.
      let c = col;
      let r = row;
      const SAFE_CAP = 256;
      let i = 0;
      while (taken.has(key(c, r)) && i < SAFE_CAP) {
        r += 1;
        if (r > 16) { c += 1; r = 0; }
        i += 1;
      }
      const finalPos: DesktopIconPos = { col: c, row: r };
      // Collect ALL current positions and override the dragged icon's slot.
      const batch: Record<string, DesktopIconPos> = {};
      for (const app of shortcuts) {
        batch[app.id] =
          app.id === id
            ? finalPos
            : (arrangedPositions.get(app.id) ?? { col: 0, row: 0 });
      }
      setIconPositions(batch);
    },
    [shortcuts, arrangedPositions, setIconPositions],
  );

  // Defensive: a misbehaving inner element (e.g. a focused window with
  // `scrollIntoView`) can scroll the desktop container away from origin.
  // Reset on any scroll event.
  const onDesktopScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    if (el.scrollTop !== 0 || el.scrollLeft !== 0) {
      el.scrollTop = 0;
      el.scrollLeft = 0;
    }
  }, []);

  return (
    <>
      <BootScreen />

      {/* Desktop shell — visible on md+ */}
      <div
        ref={desktopRef}
        className={cn(
          "fixed inset-0 overflow-hidden",
          "hidden md:block", // hidden on mobile
          crtMode && "crt-mode",
        )}
        // a11y: identify as application region
        role="application"
        aria-label="Aan OS desktop"
      >
        <Wallpaper />

        {/* Desktop area + icons (right-click here for context menu) */}
        <ContextMenu items={desktopContextItems}>
          <div
            id="main-content"
            tabIndex={-1}
            onScroll={onDesktopScroll}
            className="absolute inset-x-0 top-0 overflow-hidden"
            style={{ bottom: "var(--taskbar-h, 48px)" }}
          >
            <div
              role="grid"
              aria-label="Desktop shortcuts"
              className="absolute left-3 top-3"
              style={{
                width: `calc(100% - 24px)`,
                height: `calc(100% - 24px)`,
                // Each child positions itself absolutely.
                pointerEvents: "none",
              }}
            >
              {shortcuts.map((app) => {
                const pos =
                  arrangedPositions.get(app.id) ?? { col: 0, row: 0 };
                return (
                  <div
                    key={app.id}
                    role="gridcell"
                    style={{ pointerEvents: "auto" }}
                  >
                    <DesktopIcon
                      app={app}
                      pos={pos}
                      onDrop={commitDrop}
                    />
                  </div>
                );
              })}
            </div>

            {/* Open windows live here */}
            {hydratedWindows && <WindowManager />}
          </div>
        </ContextMenu>

        {/* Taskbar */}
        <Taskbar
          onStartClick={() => setStartMenuOpen((v) => !v)}
          startMenuOpen={startMenuOpen}
        />
        <StartMenu open={startMenuOpen} onClose={() => setStartMenuOpen(false)} />
      </div>

      {/* Mobile shell */}
      <div className="md:hidden">
        <MobileLayout initialAppId={autoOpen?.id} />
      </div>
    </>
  );
}
