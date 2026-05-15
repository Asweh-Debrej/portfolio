"use client";

import { useSettingsStore, WALLPAPERS, type WallpaperId } from "@/lib/store/settingsStore";
import type { AppProps } from "@/lib/registry";
import { cn } from "@/lib/utils";

export default function Settings(_props: AppProps) {
  const {
    theme,
    setTheme,
    wallpaper,
    setWallpaper,
    soundEnabled,
    setSoundEnabled,
    parallaxEnabled,
    setParallaxEnabled,
    reset,
  } = useSettingsStore();

  return (
    <div className="flex flex-col gap-6 p-6">
      <section>
        <h2 className="mb-2 text-sm font-semibold">Appearance</h2>
        <div className="flex gap-2">
          {(["light", "dark"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTheme(t)}
              aria-pressed={theme === t}
              className={cn(
                "rounded-md border px-3 py-1.5 text-sm capitalize transition-colors",
                theme === t
                  ? "border-[var(--color-accent)] bg-[var(--color-accent)] text-white"
                  : "border-[var(--color-border)] hover:bg-[color-mix(in_oklch,var(--color-fg)_6%,transparent)]",
              )}
            >
              {t}
            </button>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-2 text-sm font-semibold">Wallpaper</h2>
        <div className="grid grid-cols-3 gap-2">
          {WALLPAPERS.map((w) => (
            <button
              key={w.id}
              type="button"
              onClick={() => setWallpaper(w.id)}
              aria-pressed={wallpaper === w.id}
              className={cn(
                "group flex flex-col gap-1 rounded-md border p-1 text-xs transition-all",
                wallpaper === w.id
                  ? "border-[var(--color-accent)] ring-2 ring-[var(--color-accent)]"
                  : "border-[var(--color-border)] hover:border-[var(--color-fg-muted)]",
              )}
            >
              <span
                className={cn("h-16 rounded", wallpaperPreviewClass(w.id))}
                aria-hidden="true"
              />
              <span className="pt-0.5 text-center">{w.name}</span>
            </button>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-2 text-sm font-semibold">Behaviour</h2>
        <div className="flex flex-col gap-2 text-sm">
          <Toggle label="UI sound effects" value={soundEnabled} onChange={setSoundEnabled} />
          <Toggle
            label="Wallpaper parallax"
            value={parallaxEnabled}
            onChange={setParallaxEnabled}
          />
        </div>
      </section>

      <section>
        <h2 className="mb-2 text-sm font-semibold">Shortcuts</h2>
        <dl className="grid grid-cols-[max-content_1fr] gap-x-4 gap-y-1 text-xs text-[var(--color-fg-muted)]">
          <dt className="font-mono">Esc</dt><dd>Close focused window</dd>
          <dt className="font-mono">F11</dt><dd>Toggle maximize</dd>
          <dt className="font-mono">Ctrl + \</dt><dd>Cycle focus</dd>
          <dt className="font-mono">Ctrl + Shift + D</dt><dd>Show desktop</dd>
          <dt className="font-mono">Shift + Esc</dt><dd>Toggle start menu</dd>
        </dl>
      </section>

      <section>
        <button
          type="button"
          onClick={reset}
          className="rounded-md border border-[var(--color-border)] px-3 py-1.5 text-xs transition-colors hover:bg-red-500/85 hover:text-white"
        >
          Reset all settings
        </button>
      </section>
    </div>
  );
}

function Toggle({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-3 rounded-md px-2 py-1.5 hover:bg-[color-mix(in_oklch,var(--color-fg)_4%,transparent)]">
      <span>{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={value}
        onClick={() => onChange(!value)}
        className={cn(
          "relative h-5 w-9 rounded-full transition-colors",
          value
            ? "bg-[var(--color-accent)]"
            : "bg-[color-mix(in_oklch,var(--color-fg)_20%,transparent)]",
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform",
            value ? "translate-x-0" : "translate-x-[-16px]",
          )}
        />
      </button>
    </label>
  );
}

function wallpaperPreviewClass(id: WallpaperId): string {
  switch (id) {
    case "aurora":
      return "wallpaper-aurora";
    case "sunset":
      return "wallpaper-sunset";
    case "forest":
      return "wallpaper-forest";
  }
}
