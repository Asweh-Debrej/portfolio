import { describe, it, expect, beforeEach } from "vitest";
import { useSettingsStore } from "@/lib/store/settingsStore";

beforeEach(() => {
  // Reset to a known baseline. The store is a singleton so we have to clear
  // its piece manually between tests.
  useSettingsStore.setState({
    desktopIconPositions: {},
  });
  // Clean storage so persistence is well-defined per test.
  if (typeof localStorage !== "undefined") localStorage.clear();
});

describe("settingsStore.desktopIconPositions", () => {
  it("starts empty", () => {
    expect(useSettingsStore.getState().desktopIconPositions).toEqual({});
  });

  it("setIconPosition() stores a single icon's grid cell", () => {
    useSettingsStore.getState().setIconPosition("about-me", { col: 2, row: 3 });
    expect(
      useSettingsStore.getState().desktopIconPositions["about-me"],
    ).toEqual({ col: 2, row: 3 });
  });

  it("setIconPosition() preserves existing entries", () => {
    const { setIconPosition } = useSettingsStore.getState();
    setIconPosition("about-me", { col: 0, row: 0 });
    setIconPosition("contact", { col: 1, row: 2 });
    const all = useSettingsStore.getState().desktopIconPositions;
    expect(all["about-me"]).toEqual({ col: 0, row: 0 });
    expect(all["contact"]).toEqual({ col: 1, row: 2 });
  });

  it("resetIconPositions() clears everything", () => {
    const { setIconPosition, resetIconPositions } = useSettingsStore.getState();
    setIconPosition("about-me", { col: 4, row: 4 });
    resetIconPositions();
    expect(useSettingsStore.getState().desktopIconPositions).toEqual({});
  });

  it("partialize includes desktopIconPositions for persistence", () => {
    useSettingsStore
      .getState()
      .setIconPosition("about-me", { col: 5, row: 1 });
    // Zustand's persist middleware writes synchronously to localStorage in
    // jsdom; the polyfill in tests/setup.ts hooks setItem.
    const raw = localStorage.getItem("aan:settings");
    expect(raw).toBeTruthy();
    const parsed = JSON.parse(raw as string);
    expect(parsed.state.desktopIconPositions).toEqual({
      "about-me": { col: 5, row: 1 },
    });
  });
});
