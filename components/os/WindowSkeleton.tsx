"use client";

import { cn } from "@/lib/utils";

interface WindowSkeletonProps {
  className?: string;
  /** Number of fake "lines" of content. */
  lines?: number;
}

/**
 * Generic shimmer placeholder used as `<Suspense>` fallback inside windows
 * while their lazy-loaded chunk is being fetched.
 *
 * Visual contract
 * ---------------
 * - Title bar block at top
 * - A row of toolbar pills
 * - N lines of content with varying widths
 *
 * Reduced-motion: the `.shimmer` class respects `prefers-reduced-motion`
 * via globals.css.
 */
export function WindowSkeleton({ className, lines = 6 }: WindowSkeletonProps) {
  return (
    <div className={cn("flex h-full w-full flex-col gap-3 p-6", className)} aria-busy="true">
      <div className="shimmer h-7 w-2/3 rounded-md" />
      <div className="flex gap-2">
        <div className="shimmer h-5 w-16 rounded-full" />
        <div className="shimmer h-5 w-20 rounded-full" />
        <div className="shimmer h-5 w-14 rounded-full" />
      </div>
      <div className="mt-2 flex flex-col gap-2">
        {Array.from({ length: lines }).map((_, i) => (
          <div
            key={i}
            className="shimmer h-3.5 rounded-md"
            style={{ width: `${60 + ((i * 13) % 40)}%` }}
          />
        ))}
      </div>
      <span className="sr-only">Loading window content…</span>
    </div>
  );
}
