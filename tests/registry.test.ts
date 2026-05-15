import { describe, it, expect } from "vitest";
import { listApps, getAppMeta } from "@/lib/registry";

describe("app registry", () => {
  it("exposes a non-empty list of apps", () => {
    expect(listApps().length).toBeGreaterThan(0);
  });

  it("every app has the required shape", () => {
    for (const app of listApps()) {
      expect(app.id).toMatch(/^[a-z0-9-]+$/);
      expect(app.title).toBeTruthy();
      expect(app.icon).toBeTruthy();
      expect(app.defaultSize.w).toBeGreaterThanOrEqual(320);
      expect(app.defaultSize.h).toBeGreaterThanOrEqual(220);
      expect(app.component).toBeTruthy();
    }
  });

  it("ids are unique", () => {
    const ids = listApps().map((a) => a.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("getAppMeta returns the right entry by id", () => {
    expect(getAppMeta("about-me")?.title).toBe("About Me");
    expect(getAppMeta("does-not-exist")).toBeUndefined();
  });
});
