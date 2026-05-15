"use client";

import { useEffect } from "react";

/**
 * `useFocusTrap` - when `active`, keeps Tab/Shift+Tab focus inside `containerRef`.
 *
 * - On activation: focus the first focusable element (or the container itself
 *   if `initialFocus` is `'container'`).
 * - On deactivation: restore focus to the element that was focused before
 *   activation (if any).
 * - Does NOT prevent click-out - windows are not modal. Tab order only.
 */
export function useFocusTrap(
  containerRef: React.RefObject<HTMLElement | null>,
  active: boolean,
  options: { initialFocus?: "first" | "container" | "none" } = {},
) {
  useEffect(() => {
    if (!active) return;
    const container = containerRef.current;
    if (!container) return;
    const previousActive = document.activeElement as HTMLElement | null;

    const focusableSelector = [
      "a[href]",
      "button:not([disabled])",
      "textarea:not([disabled])",
      "input:not([disabled]):not([type='hidden'])",
      "select:not([disabled])",
      "[tabindex]:not([tabindex='-1'])",
    ].join(",");

    const getFocusable = () =>
      Array.from(container.querySelectorAll<HTMLElement>(focusableSelector)).filter(
        (el) => !el.hasAttribute("disabled") && el.offsetParent !== null,
      );

    const initial = options.initialFocus ?? "first";
    if (initial === "first") {
      const first = getFocusable()[0];
      first?.focus();
    } else if (initial === "container") {
      container.focus();
    }

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;
      const focusable = getFocusable();
      if (focusable.length === 0) {
        e.preventDefault();
        container.focus();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    container.addEventListener("keydown", onKeyDown);
    return () => {
      container.removeEventListener("keydown", onKeyDown);
      // Restore focus only if it's still inside the container.
      if (document.activeElement && container.contains(document.activeElement)) {
        previousActive?.focus?.();
      }
    };
  }, [active, containerRef, options.initialFocus]);
}
