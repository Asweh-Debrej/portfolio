"use client";

import { useEffect, useState } from "react";
import type { AppProps } from "@/lib/registry";

/**
 * About Me — pulls `content/about.mdx` rendered to HTML at build time and
 * delivered via dynamic import of the `meta`-bearing MDX module.
 *
 * We dynamically `import()` instead of statically importing so the MDX chunk
 * is split into the app's own bundle (kept off the desktop-shell payload).
 */
export default function AboutMe(_props: AppProps) {
  const [Content, setContent] = useState<React.ComponentType | null>(null);

  useEffect(() => {
    let mounted = true;
    import("@/content/about.mdx").then((mod) => {
      if (mounted) setContent(() => mod.default);
    });
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <article className="prose prose-sm max-w-none p-6 dark:prose-invert">
      {Content ? <Content /> : <p>Loading…</p>}
    </article>
  );
}
