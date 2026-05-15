import { describe, it, expect, beforeEach } from "vitest";
import { useWindowStore, TASKBAR_HEIGHT, MIN_W, MIN_H } from "@/lib/store/windowStore";

// Convenience: reset the store between tests.
beforeEach(() => {
  useWindowStore.setState({
    windows: {},
    order: [],
    focusedId: null,
    zCounter: 1,
    dragPreview: { side: null, visible: false },
    hydrated: true,
  });
  // Make defaultPosition deterministic.
  Object.defineProperty(window, "innerWidth", { configurable: true, value: 1440 });
  Object.defineProperty(window, "innerHeight", { configurable: true, value: 900 });
});

describe("windowStore", () => {
  it("open() spawns a window and focuses it", () => {
    const { open } = useWindowStore.getState();
    open("about-me", { defaultSize: { w: 500, h: 400 } });
    const s = useWindowStore.getState();
    expect(s.windows["about-me"]).toBeDefined();
    expect(s.focusedId).toBe("about-me");
    expect(s.order).toEqual(["about-me"]);
  });

  it("open() on an existing window re-focuses without duplicating", () => {
    const { open } = useWindowStore.getState();
    open("about-me");
    open("contact");
    open("about-me", { param: "x" });
    const s = useWindowStore.getState();
    expect(s.order).toEqual(["about-me", "contact"]);
    expect(s.focusedId).toBe("about-me");
    expect(s.windows["about-me"].param).toBe("x");
  });

  it("close() picks a new focus", () => {
    const { open, close } = useWindowStore.getState();
    open("about-me");
    open("contact");
    expect(useWindowStore.getState().focusedId).toBe("contact");
    close("contact");
    expect(useWindowStore.getState().focusedId).toBe("about-me");
    expect(useWindowStore.getState().windows.contact).toBeUndefined();
  });

  it("minimize() unfocuses if it was focused", () => {
    const { open, minimize } = useWindowStore.getState();
    open("about-me");
    expect(useWindowStore.getState().focusedId).toBe("about-me");
    minimize("about-me");
    expect(useWindowStore.getState().focusedId).toBeNull();
    expect(useWindowStore.getState().windows["about-me"].minimized).toBe(true);
  });

  it("toggleMax() preserves restore geometry", () => {
    const { open, toggleMax, move } = useWindowStore.getState();
    open("about-me", { defaultSize: { w: 600, h: 400 } });
    move("about-me", 100, 80);
    const before = { ...useWindowStore.getState().windows["about-me"] };
    toggleMax("about-me");
    expect(useWindowStore.getState().windows["about-me"].maximized).toBe(true);
    expect(useWindowStore.getState().windows["about-me"].restore).toMatchObject({
      x: before.x,
      y: before.y,
      w: before.w,
      h: before.h,
    });
    toggleMax("about-me");
    const after = useWindowStore.getState().windows["about-me"];
    expect(after.maximized).toBe(false);
    expect(after).toMatchObject({ x: before.x, y: before.y, w: before.w, h: before.h });
  });

  it("resize() clamps to minimums", () => {
    const { open, resize } = useWindowStore.getState();
    open("about-me");
    resize("about-me", 10, 10);
    const w = useWindowStore.getState().windows["about-me"];
    expect(w.w).toBeGreaterThanOrEqual(MIN_W);
    expect(w.h).toBeGreaterThanOrEqual(MIN_H);
  });

  it("clampToViewport() rescues off-screen windows after shrinking screen", () => {
    const { open, clampToViewport } = useWindowStore.getState();
    open("about-me", { defaultSize: { w: 600, h: 400 } });
    useWindowStore.setState((s) => ({
      windows: {
        ...s.windows,
        "about-me": { ...s.windows["about-me"], x: 5000, y: 5000 },
      },
    }));
    clampToViewport(800, 600);
    const w = useWindowStore.getState().windows["about-me"];
    expect(w.x).toBeLessThan(800);
    expect(w.y).toBeLessThan(600 - TASKBAR_HEIGHT);
  });

  it("focus() bumps zIndex above siblings", () => {
    const { open, focus } = useWindowStore.getState();
    open("about-me");
    open("contact");
    expect(useWindowStore.getState().windows["contact"].zIndex).toBeGreaterThan(
      useWindowStore.getState().windows["about-me"].zIndex,
    );
    focus("about-me");
    expect(useWindowStore.getState().windows["about-me"].zIndex).toBeGreaterThan(
      useWindowStore.getState().windows["contact"].zIndex,
    );
  });

  it("applySnap() saves restore + applies geometry", () => {
    const { open, applySnap } = useWindowStore.getState();
    open("about-me");
    applySnap("about-me", "left");
    const w = useWindowStore.getState().windows["about-me"];
    expect(w.x).toBe(0);
    expect(w.restore).toBeDefined();
  });

  it("closeAll() empties the store", () => {
    const { open, closeAll } = useWindowStore.getState();
    open("about-me");
    open("contact");
    closeAll();
    const s = useWindowStore.getState();
    expect(s.order).toEqual([]);
    expect(s.focusedId).toBeNull();
    expect(Object.keys(s.windows)).toEqual([]);
  });

  it("restoreFromMaxAt() un-maximises and anchors window to the cursor", () => {
    const { open, toggleMax, restoreFromMaxAt } = useWindowStore.getState();
    open("about-me", { defaultSize: { w: 600, h: 400 } });
    // Move first so restore geometry is non-default.
    useWindowStore.getState().move("about-me", 120, 80);
    toggleMax("about-me");
    expect(useWindowStore.getState().windows["about-me"].maximized).toBe(true);

    // Cursor near the right edge — the restored window should land mostly to
    // the left of the cursor, preserving the proportional X position.
    const anchor = restoreFromMaxAt("about-me", 1200, 8);
    expect(anchor).not.toBeNull();
    const w = useWindowStore.getState().windows["about-me"];
    expect(w.maximized).toBe(false);
    expect(w.restore).toBeUndefined();
    // Window width = 600, cursor x = 1200, vw = 1440 → ratio ≈ 0.833 → newX ≈ 700.
    expect(anchor!.x).toBeGreaterThan(600);
    expect(anchor!.x).toBeLessThan(900);
    // Y is clamped to a non-negative value near the top.
    expect(anchor!.y).toBeGreaterThanOrEqual(0);
    expect(anchor!.y).toBeLessThan(50);
    expect(w.x).toBe(anchor!.x);
    expect(w.y).toBe(anchor!.y);
  });

  it("restoreFromMaxAt() returns null when window is not maximised", () => {
    const { open, restoreFromMaxAt } = useWindowStore.getState();
    open("about-me");
    expect(restoreFromMaxAt("about-me", 100, 100)).toBeNull();
    expect(restoreFromMaxAt("does-not-exist", 100, 100)).toBeNull();
  });
});
