#!/usr/bin/env node
/**
 * build-projects-index.mjs
 *
 * Scans `/content/projects/*.mdx`, extracts the YAML frontmatter block, and
 * writes a TypeScript manifest at `lib/projects.generated.ts` that the rest
 * of the app consumes.
 *
 * Run via `predev` / `prebuild` hooks (see package.json scripts). Idempotent:
 * if the generated file already matches expected output, it is left alone
 * so file watchers don't fire.
 *
 * Why generate instead of `require.context` / glob-import?
 * - Turbopack (Next.js dev) doesn't support webpack's `require.context`.
 * - `import.meta.glob` is Vite-only.
 * - Manual static imports are visible to the bundler, work with Turbopack &
 *   webpack, and survive type-checking.
 */

import { readdirSync, readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const PROJECTS_DIR = join(ROOT, "content", "projects");
const OUTPUT_FILE = join(ROOT, "lib", "projects.generated.ts");

function parseFrontmatter(source) {
  const m = source.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!m) return null;
  const body = m[1];
  const lines = body.split(/\r?\n/);
  const obj = {};
  let currentKey = null;
  let currentList = null;
  for (const raw of lines) {
    if (!raw.trim()) continue;
    // List item under previous key.
    if (raw.startsWith("  - ") || raw.startsWith("- ")) {
      const content = raw.replace(/^\s*-\s+/, "").trim();
      if (!currentList) continue;
      // Inline object e.g. { label: "Live", href: "https://..." }
      if (content.startsWith("{") && content.endsWith("}")) {
        const inner = content.slice(1, -1);
        const pair = {};
        for (const seg of inner.split(",")) {
          const [k, ...vparts] = seg.split(":");
          const v = vparts.join(":").trim();
          pair[k.trim()] = stripQuotes(v);
        }
        currentList.push(pair);
      } else {
        currentList.push(stripQuotes(content));
      }
      continue;
    }
    const idx = raw.indexOf(":");
    if (idx === -1) continue;
    const key = raw.slice(0, idx).trim();
    const value = raw.slice(idx + 1).trim();
    currentKey = key;
    if (value === "") {
      // Block list follows.
      currentList = [];
      obj[key] = currentList;
    } else if (value.startsWith("[") && value.endsWith("]")) {
      // Inline list.
      const inner = value.slice(1, -1);
      obj[key] = inner.split(",").map((s) => stripQuotes(s.trim())).filter(Boolean);
      currentList = null;
    } else if (value === "true" || value === "false") {
      obj[key] = value === "true";
      currentList = null;
    } else if (/^-?\d+(\.\d+)?$/.test(value)) {
      obj[key] = Number(value);
      currentList = null;
    } else {
      obj[key] = stripQuotes(value);
      currentList = null;
    }
  }
  return obj;
}

function stripQuotes(s) {
  if (!s) return s;
  if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
    return s.slice(1, -1);
  }
  return s;
}

function validate(slug, meta) {
  const required = ["title", "slug", "year", "role", "summary"];
  for (const k of required) {
    if (meta[k] === undefined || meta[k] === null || meta[k] === "") {
      throw new Error(`[projects] ${slug}.mdx: missing required frontmatter "${k}"`);
    }
  }
  if (meta.slug !== slug) {
    throw new Error(
      `[projects] ${slug}.mdx: frontmatter slug "${meta.slug}" must equal filename stem "${slug}"`,
    );
  }
  if (typeof meta.year !== "number") {
    throw new Error(`[projects] ${slug}.mdx: year must be a number`);
  }
  if (!/^[a-z0-9-]+$/.test(meta.slug)) {
    throw new Error(`[projects] ${slug}.mdx: slug must be kebab-case`);
  }
}

function camel(name) {
  return name
    .replace(/(^|-)(.)/g, (_, _dash, c) => c.toUpperCase())
    .replace(/[^A-Za-z0-9]/g, "");
}

function main() {
  if (!existsSync(PROJECTS_DIR)) {
    mkdirSync(PROJECTS_DIR, { recursive: true });
  }
  const files = readdirSync(PROJECTS_DIR)
    .filter((f) => f.endsWith(".mdx") && !f.startsWith("_"))
    .sort();

  const entries = [];
  for (const file of files) {
    const slug = file.replace(/\.mdx$/, "");
    const source = readFileSync(join(PROJECTS_DIR, file), "utf8");
    const meta = parseFrontmatter(source);
    if (!meta) {
      throw new Error(`[projects] ${file}: missing YAML frontmatter block`);
    }
    validate(slug, meta);
    entries.push({ slug, meta, varName: `Project_${camel(slug)}` });
  }

  // Sort: featured first, then year desc, then title asc.
  entries.sort((a, b) => {
    const af = !!a.meta.featured;
    const bf = !!b.meta.featured;
    if (af !== bf) return af ? -1 : 1;
    if (a.meta.year !== b.meta.year) return b.meta.year - a.meta.year;
    return String(a.meta.title).localeCompare(String(b.meta.title));
  });

  const imports = entries
    .map((e) => `import ${e.varName}, { meta as ${e.varName}Meta } from "@/content/projects/${e.slug}.mdx";`)
    .join("\n");

  const list = entries
    .map(
      (e) =>
        `  { slug: ${JSON.stringify(e.slug)}, meta: ${e.varName}Meta as ProjectMeta, Component: ${e.varName} },`,
    )
    .join("\n");

  const out = `/* AUTO-GENERATED by scripts/build-projects-index.mjs — DO NOT EDIT. */
import type { ComponentType } from "react";
import type { ProjectMeta } from "./projects-types";
${imports}

export interface ProjectEntry {
  slug: string;
  meta: ProjectMeta;
  Component: ComponentType;
}

export const generatedProjects: ProjectEntry[] = [
${list}
];
`;

  // Ensure lib dir exists.
  mkdirSync(dirname(OUTPUT_FILE), { recursive: true });
  if (existsSync(OUTPUT_FILE) && readFileSync(OUTPUT_FILE, "utf8") === out) {
    // Nothing changed, leave file alone.
    return;
  }
  writeFileSync(OUTPUT_FILE, out);
  console.log(`[projects] wrote ${entries.length} entries to lib/projects.generated.ts`);
}

main();
