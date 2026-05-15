import { describe, it, expect, vi } from "vitest";

// MDX modules are not available in the test environment (no MDX loader plugin
// in vitest). Mock the generated index with deterministic fixtures.
vi.mock("@/lib/projects.generated", () => {
  const Fixture = () => null;
  return {
    generatedProjects: [
      {
        slug: "alpha",
        Component: Fixture,
        meta: {
          title: "Alpha",
          slug: "alpha",
          year: 2024,
          role: "Lead",
          summary: "An alpha project used in tests.",
          featured: true,
        },
      },
      {
        slug: "bravo",
        Component: Fixture,
        meta: {
          title: "Bravo",
          slug: "bravo",
          year: 2023,
          role: "Dev",
          summary: "A bravo project used in tests.",
        },
      },
    ],
  };
});

const { listProjects, getProjectBySlug } = await import("@/lib/projects");

describe("project index", () => {
  it("lists projects", () => {
    expect(listProjects().length).toBe(2);
  });

  it("featured projects appear before unfeatured", () => {
    const projects = listProjects();
    let seenUnfeatured = false;
    for (const p of projects) {
      if (!p.meta.featured) seenUnfeatured = true;
      else if (seenUnfeatured) {
        throw new Error("Featured project found after unfeatured — sort broken");
      }
    }
  });

  it("getProjectBySlug() returns the right entry or undefined", () => {
    expect(getProjectBySlug("alpha")?.meta.title).toBe("Alpha");
    expect(getProjectBySlug("does-not-exist-slug-zzz")).toBeUndefined();
  });

  it("withDefaults fills missing array fields", () => {
    for (const p of listProjects()) {
      expect(Array.isArray(p.meta.stack)).toBe(true);
      expect(Array.isArray(p.meta.tags)).toBe(true);
      expect(Array.isArray(p.meta.links)).toBe(true);
    }
  });
});
