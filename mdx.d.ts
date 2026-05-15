/**
 * Ambient declaration so TypeScript knows what an `.mdx` import looks like.
 * Next.js with @next/mdx renders each MDX file into a React component
 * (default export) plus any `export const ...` from the file (including the
 * `meta` injected by remark-mdx-frontmatter).
 */

declare module "*.mdx" {
  import type { ComponentType } from "react";
  const MDXComponent: ComponentType<Record<string, unknown>>;
  // Re-export named bindings (`meta` etc.) without forcing a shape — readers
  // narrow as needed.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export const meta: any;
  export default MDXComponent;
}
