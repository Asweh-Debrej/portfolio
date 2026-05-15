/**
 * Single source of truth for all site-level constants.
 *
 * Centralised here so that layout.tsx, sitemap.ts, robots.ts, and
 * per-route generateMetadata() all read from one place instead of
 * duplicating strings or importing from each other.
 */

export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://asweh.com";

export const SITE_NAME = "Aan Portfolio";

/**
 * ~156 chars, within the 160-char SERP display limit.
 * Includes name, location, and key domains for keyword relevance.
 */
export const SITE_DESCRIPTION =
  "Portfolio of Muhamad Farhan Syakir, software engineer from Bandung, Indonesia. Full-stack web apps, robotics, and XR projects in an interactive desktop UI.";

export const AUTHOR_NAME = "Muhamad Farhan Syakir, S.T.";
export const AUTHOR_SHORT = "Aan";

export const GITHUB_URL = "https://github.com/Asweh-Debrej";
export const LINKEDIN_URL = "https://linkedin.com/in/muhamadfarhansyakir";
export const EMAIL = "aswehdebrej@gmail.com";

/**
 * Base keyword list applied to every page.
 * Per-route generateMetadata() extends this with project-specific tags/stack.
 */
export const DEFAULT_KEYWORDS: string[] = [
  "Muhamad Farhan Syakir",
  "Aan",
  "Asweh",
  "portfolio",
  "software engineer",
  "software engineering",
  "web development",
  "full-stack developer",
  "Next.js",
  "TypeScript",
  "React",
  "ITB",
  "Institut Teknologi Bandung",
  "Bandung",
  "Indonesia",
  "robotics",
  "XR",
  "interactive portfolio",
  "desktop OS",
];
