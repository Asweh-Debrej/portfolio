/**
 * Project meta type — kept separate from `lib/projects.ts` so the
 * auto-generated `projects.generated.ts` file can import it without pulling
 * in zod (which is only used for runtime validation in dev).
 */

export interface ProjectLink {
  label: string;
  href: string;
}

export interface ProjectMeta {
  title: string;
  slug: string;
  year: number;
  role: string;
  stack: string[];
  summary: string;
  cover?: string;
  links: ProjectLink[];
  tags: string[];
  featured: boolean;
}
