/**
 * User-facing settings: theme, wallpaper, sound, accent.
 *
 * Persisted under `aan:settings` so the pre-paint script in `app/layout.tsx`
 * can read theme synchronously to avoid FOUC. Don't rename the key without
 * updating that script too.
 */

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export type Theme = "light" | "dark";
export type WallpaperId = "aurora" | "sunset" | "forest";

export const WALLPAPERS: { id: WallpaperId; name: string }[] = [
  { id: "aurora", name: "Aurora" },
  { id: "sunset", name: "Sunset" },
  { id: "forest", name: "Forest" },
];

/**
 * A position on the desktop icon grid. Cells are 88 px wide (icon = 80 px +
 * 8 px gap) and 100 px tall.
 */
export interface DesktopIconPos {
  col: number;
  row: number;
}

export interface SettingsStore {
  theme: Theme;
  wallpaper: WallpaperId;
  soundEnabled: boolean;
  parallaxEnabled: boolean;
  hasSeenBoot: boolean;
  /**
   * User-arranged positions on the desktop grid, keyed by app id. Missing
   * entries fall back to the natural order in `listDesktopShortcuts()`.
   */
  desktopIconPositions: Record<string, DesktopIconPos>;
  hydrated: boolean;

  setTheme: (t: Theme) => void;
  toggleTheme: () => void;
  setWallpaper: (w: WallpaperId) => void;
  setSoundEnabled: (v: boolean) => void;
  setParallaxEnabled: (v: boolean) => void;
  markBootSeen: () => void;
  setIconPosition: (id: string, pos: DesktopIconPos) => void;
  setIconPositions: (positions: Record<string, DesktopIconPos>) => void;
  resetIconPositions: () => void;
  reset: () => void;
  _markHydrated: () => void;
}

const DEFAULTS = {
  theme: "light" as Theme,
  wallpaper: "aurora" as WallpaperId,
  soundEnabled: false,
  parallaxEnabled: true,
  hasSeenBoot: false,
  desktopIconPositions: {} as Record<string, DesktopIconPos>,
};

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set) => ({
      ...DEFAULTS,
      hydrated: false,
      setTheme: (t) => {
        set({ theme: t });
        applyThemeClass(t);
      },
      toggleTheme: () => {
        let next: Theme = "light";
        set((s) => {
          next = s.theme === "light" ? "dark" : "light";
          return { theme: next };
        });
        applyThemeClass(next);
      },
      setWallpaper: (w) => set({ wallpaper: w }),
      setSoundEnabled: (v) => set({ soundEnabled: v }),
      setParallaxEnabled: (v) => set({ parallaxEnabled: v }),
      markBootSeen: () => set({ hasSeenBoot: true }),
      setIconPosition: (id, pos) =>
        set((s) => ({
          desktopIconPositions: { ...s.desktopIconPositions, [id]: pos },
        })),
      setIconPositions: (positions) =>
        set((s) => ({
          desktopIconPositions: { ...s.desktopIconPositions, ...positions },
        })),
      resetIconPositions: () => set({ desktopIconPositions: {} }),
      reset: () => {
        set({ ...DEFAULTS, hydrated: true });
        applyThemeClass(DEFAULTS.theme);
      },
      _markHydrated: () => set({ hydrated: true }),
    }),
    {
      name: "aan:settings",
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        theme: state.theme,
        wallpaper: state.wallpaper,
        soundEnabled: state.soundEnabled,
        parallaxEnabled: state.parallaxEnabled,
        hasSeenBoot: state.hasSeenBoot,
        desktopIconPositions: state.desktopIconPositions,
      }),
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        applyThemeClass(state.theme);
        state._markHydrated();
      },
    },
  ),
);

function applyThemeClass(theme: Theme) {
  if (typeof document === "undefined") return;
  document.documentElement.classList.toggle("dark", theme === "dark");
}
