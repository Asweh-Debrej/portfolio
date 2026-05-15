"use client";

import { useEffect, useState } from "react";
import { Download } from "lucide-react";
import type { AppProps } from "@/lib/registry";

/**
 * Resume - Markdown-formatted CV rendered via MDX, with a "Download PDF"
 * shortcut linking to `/resume.pdf` (place the file in `/public`).
 */
export default function ResumeViewer(_props: AppProps) {
  const [Content, setContent] = useState<React.ComponentType | null>(null);

  useEffect(() => {
    let mounted = true;
    import("@/content/resume.mdx").then((mod) => {
      if (mounted) setContent(() => mod.default);
    });
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-[var(--color-border)] px-6 py-3">
        <h1 className="text-sm font-medium">Resume</h1>
        <a
          href="/resume.pdf"
          download
          className="inline-flex items-center gap-1.5 rounded-md border border-[var(--color-border)] px-2.5 py-1 text-xs transition-colors hover:bg-[color-mix(in_oklch,var(--color-fg)_6%,transparent)]"
        >
          <Download size={13} /> PDF
        </a>
      </div>
      <article className="prose prose-sm max-w-none overflow-auto p-6 dark:prose-invert">
        {Content ? <Content /> : <p>Loading…</p>}
      </article>
    </div>
  );
}
