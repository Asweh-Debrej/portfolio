"use client";

import { useEffect } from "react";

const KONAMI = [
  "ArrowUp",
  "ArrowUp",
  "ArrowDown",
  "ArrowDown",
  "ArrowLeft",
  "ArrowRight",
  "ArrowLeft",
  "ArrowRight",
  "b",
  "a",
];

/**
 * Listens for the classic Konami sequence; calls `onTrigger` when matched.
 * Sequence resets on any mismatched key.
 */
export function useKonami(onTrigger: () => void) {
  useEffect(() => {
    let buf: string[] = [];
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      // Ignore while typing.
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA")) return;
      buf.push(e.key.length === 1 ? e.key.toLowerCase() : e.key);
      if (buf.length > KONAMI.length) buf = buf.slice(buf.length - KONAMI.length);
      if (buf.length === KONAMI.length && buf.every((k, i) => k === KONAMI[i])) {
        buf = [];
        onTrigger();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onTrigger]);
}
