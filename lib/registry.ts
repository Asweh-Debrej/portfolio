/**
 * App registry — declarative source of truth for every "app" available in
 * the OS shell. Each entry maps an `id` → metadata + lazy-loaded component.
 *
 * Why lazy?
 * ---------
 * Each app is its own dynamic-import chunk. The desktop shell only ships the
 * registry + window manager on first load; opening an app fetches its chunk
 * on demand and shows `<WindowSkeleton>` until ready. This keeps First Load
 * JS small (the build budget is ≤ 120 KB gzip).
 *
 * Adding a new app
 * ----------------
 * 1. Drop a component into `components/apps/<Name>.tsx` whose props are
 *    `{ param?: string }`.
 * 2. Add an entry below. Pick an `icon` from `lucide-react`.
 * 3. (Optional) Set `hidden: true` to keep it out of the Start Menu list
 *    (useful for the `project-viewer` which is only opened via deep links
 *    or from another app).
 *
 * Component contract
 * ------------------
 * - Must be self-contained (no special context needed beyond the global
 *   stores).
 * - Must be a default export.
 * - Should respect `prefers-reduced-motion` (use `useReducedMotion`).
 * - Long content should `prose dark:prose-invert` for typography.
 */

import { lazy, type ComponentType, type LazyExoticComponent } from "react";
import type { LucideIcon } from "lucide-react";
import {
  User,
  FileText,
  Mail,
  Sparkles,
  Settings as SettingsIcon,
  FolderOpenDot,
  FileCode2,
} from "lucide-react";

export interface AppProps {
  /** App-specific arg (e.g. project slug for the project-viewer). */
  param?: string;
}

export interface AppMeta {
  id: string;
  title: string;
  icon: LucideIcon;
  /** Default size used by `windowStore.open()` for fresh spawns. */
  defaultSize: { w: number; h: number };
  /** Optional default `param` (e.g. landing project for the viewer). */
  defaultParam?: string;
  /** Hide from Start Menu list (still openable programmatically). */
  hidden?: boolean;
  /** Show as a desktop shortcut. */
  pinnedToDesktop?: boolean;
  /** Free-text search aliases. */
  keywords?: string[];
  /** Lazy-loaded component. */
  component: LazyExoticComponent<ComponentType<AppProps>>;
  /** Override the static title (e.g. show the current project slug). */
  dynamicTitle?: (param: string | undefined) => string;
}

// NOTE: lazy() forces each app into its own chunk.
const AboutMe = lazy(() => import("@/components/apps/AboutMe"));
const ResumeViewer = lazy(() => import("@/components/apps/ResumeViewer"));
const Contact = lazy(() => import("@/components/apps/Contact"));
const SkillsViewer = lazy(() => import("@/components/apps/SkillsViewer"));
const Settings = lazy(() => import("@/components/apps/Settings"));
const ProjectsExplorer = lazy(() => import("@/components/apps/ProjectsExplorer"));
const ProjectViewer = lazy(() => import("@/components/apps/ProjectViewer"));

const APPS: AppMeta[] = [
  {
    id: "about-me",
    title: "About Me",
    icon: User,
    defaultSize: { w: 640, h: 520 },
    pinnedToDesktop: true,
    component: AboutMe,
    keywords: ["bio", "intro"],
  },
  {
    id: "projects",
    title: "Projects",
    icon: FolderOpenDot,
    defaultSize: { w: 760, h: 560 },
    pinnedToDesktop: true,
    component: ProjectsExplorer,
    keywords: ["work", "portfolio", "demos"],
  },
  {
    id: "project-viewer",
    title: "Project",
    icon: FileCode2,
    defaultSize: { w: 820, h: 600 },
    hidden: true,
    component: ProjectViewer,
    dynamicTitle: (param) => (param ? `Project · ${param}` : "Project"),
  },
  {
    id: "resume",
    title: "Resume",
    icon: FileText,
    defaultSize: { w: 720, h: 600 },
    pinnedToDesktop: true,
    component: ResumeViewer,
    keywords: ["cv", "experience"],
  },
  {
    id: "skills",
    title: "Skills",
    icon: Sparkles,
    defaultSize: { w: 640, h: 520 },
    pinnedToDesktop: true,
    component: SkillsViewer,
    keywords: ["stack", "tech"],
  },
  {
    id: "contact",
    title: "Contact",
    icon: Mail,
    defaultSize: { w: 480, h: 460 },
    pinnedToDesktop: true,
    component: Contact,
    keywords: ["email", "social", "linkedin"],
  },
  {
    id: "settings",
    title: "Settings",
    icon: SettingsIcon,
    defaultSize: { w: 560, h: 480 },
    component: Settings,
    keywords: ["theme", "wallpaper", "sound", "preferences"],
  },
];

const byId = new Map<string, AppMeta>(APPS.map((a) => [a.id, a]));

export function listApps(): AppMeta[] {
  return APPS;
}

export function getAppMeta(id: string): AppMeta | undefined {
  return byId.get(id);
}

export function listDesktopShortcuts(): AppMeta[] {
  return APPS.filter((a) => a.pinnedToDesktop);
}
