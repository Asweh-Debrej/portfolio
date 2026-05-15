"use client";

import { useEffect, useState } from "react";

/**
 * `useMediaQuery` — subscribes to a `window.matchMedia` query.
 *
 * Returns `false` on first render (SSR-safe). Updates after mount, so
 * **don't use this for layout-affecting decisions on first paint** — prefer
 * CSS `@media` for those. Use this hook for behavioural branching only
 * (e.g., "disable drag on touch devices").
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mql = window.matchMedia(query);
    setMatches(mql.matches);
    const onChange = (e: MediaQueryListEvent) => setMatches(e.matches);
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, [query]);

  return matches;
}

export const useReducedMotion = () =>
  useMediaQuery("(prefers-reduced-motion: reduce)");

export const useIsMobile = () => useMediaQuery("(max-width: 768px)");

export const useIsTouch = () => useMediaQuery("(pointer: coarse)");
