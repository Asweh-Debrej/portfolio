import { describe, it, expect } from "vitest";
import { clamp, cn, uid } from "@/lib/utils";

describe("clamp", () => {
  it("returns value when within range", () => {
    expect(clamp(5, 0, 10)).toBe(5);
  });
  it("returns min when below", () => {
    expect(clamp(-1, 0, 10)).toBe(0);
  });
  it("returns max when above", () => {
    expect(clamp(99, 0, 10)).toBe(10);
  });
});

describe("cn", () => {
  it("merges class strings", () => {
    expect(cn("a", "b")).toContain("a");
    expect(cn("a", "b")).toContain("b");
  });
  it("skips falsy values", () => {
    expect(cn("a", false, undefined, "b")).toBe("a b");
  });
  it("merges tailwind conflicts (last wins)", () => {
    // tailwind-merge collapses conflicting classes; "p-2 p-3" -> "p-3"
    expect(cn("p-2", "p-3")).toBe("p-3");
  });
});

describe("uid", () => {
  it("produces unique ids on consecutive calls", () => {
    expect(uid("x")).not.toBe(uid("x"));
  });
});
