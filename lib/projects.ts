/**
 * Project index facade — wraps `projects.generated.ts` (produced by
 * `scripts/build-projects-index.mjs`) and provides typed defaults so
 * frontmatter fields like `tags`/`stack`/`links` always exist.
 *
 * The generator runs in `predev` and `prebuild`. If you add an MDX file and
 * don't see it, run `npm run gen:projects`.
 */

import { generatedProjects, type ProjectEntry } from "./projects.generated";
import type { ProjectMeta } from "./projects-types";

function withDefaults(meta: Partial<ProjectMeta>): ProjectMeta {
  return {
    title: "",
    slug: "",
    year: 0,
    role: "",
    summary: "",
    stack: [],
    links: [],
    tags: [],
    featured: false,
    cover: undefined,
    ...meta,
  };
}

const entries: ProjectEntry[] = generatedProjects.map((e) => ({
  ...e,
  meta: withDefaults(e.meta),
}));

const bySlug = new Map<string, ProjectEntry>(entries.map((e) => [e.slug, e]));

export function listProjects(): ProjectEntry[] {
  return entries;
}

export function listProjectSlugs(): string[] {
  return entries.map((e) => e.slug);
}

export function getProjectBySlug(slug: string): ProjectEntry | undefined {
  return bySlug.get(slug);
}

export type { ProjectEntry, ProjectMeta };
