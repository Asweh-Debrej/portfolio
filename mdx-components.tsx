import type { MDXComponents } from "mdx/types";

/**
 * Root MDX components map. Picked up by `@next/mdx` automatically.
 * Add wrappers here to style MDX globally (e.g., images, headings).
 */
export function useMDXComponents(components: MDXComponents): MDXComponents {
  return {
    ...components,
    // We rely on Tailwind Typography `prose` class on the wrapper,
    // so no per-element styling is needed here.
  };
}
