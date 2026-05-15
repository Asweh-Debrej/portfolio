"use client";

import { useEffect } from "react";
import { useWindowStore } from "@/lib/store/windowStore";

/**
 * Global keyboard shortcuts for the OS shell.
 *
 * Browser limitations
 * -------------------
 * - Alt+Tab and Win+D are captured by the host OS; the page can't observe them.
 * - Ctrl+Tab and Ctrl+W are captured by most browsers (tab management).
 *   We therefore use less-conflicting shortcuts and document them in Settings.
 *
 * Bindings
 * --------
 * - `Esc`                close focused window (unless typing in an input)
 * - `Alt+F4`             close focused window (best-effort: the host OS may
 *                        intercept this — Chrome on Windows lets it through,
 *                        Firefox does not)
 * - `Ctrl+Shift+W`       close focused window (reliable cross-browser; we
 *                        intentionally don't use `Ctrl+W` because every
 *                        browser intercepts it to close the current tab)
 * - `F11`                toggle maximize on focused window
 * - `Ctrl+\\`            cycle focus forward
 * - `Ctrl+Shift+\\`      cycle focus backward
 * - `Ctrl+Shift+D`       minimize all (show desktop)
 * - `Shift+Esc`          handled by caller via the `onStartMenu` callback
 */
export function useKeyboardShortcuts(opts: {
  onStartMenu?: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const inEditable =
        !!target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable);
      const store = useWindowStore.getState();

      // Shift+Esc → start menu (works even in editable elements? yes — it's
      // an unambiguous combo).
      if (e.key === "Escape" && e.shiftKey) {
        e.preventDefault();
        opts.onStartMenu?.();
        return;
      }

      if (inEditable) return;

      if (e.key === "Escape") {
        if (store.focusedId) {
          e.preventDefault();
          store.close(store.focusedId);
        }
        return;
      }

      // Alt+F4 / Ctrl+Shift+W → close focused window.
      // We check both `e.key === "F4"` and `e.code === "F4"` because layouts
      // (notably French AZERTY with NumLock) can shift the value.
      if (e.altKey && (e.key === "F4" || e.code === "F4")) {
        if (store.focusedId) {
          e.preventDefault();
          store.close(store.focusedId);
        }
        return;
      }
      if (
        e.ctrlKey &&
        e.shiftKey &&
        !e.altKey &&
        (e.key === "W" || e.key === "w")
      ) {
        if (store.focusedId) {
          e.preventDefault();
          store.close(store.focusedId);
        }
        return;
      }

      if (e.key === "F11") {
        if (store.focusedId) {
          e.preventDefault();
          store.toggleMax(store.focusedId);
        }
        return;
      }

      if (e.ctrlKey && (e.key === "\\" || e.code === "Backslash")) {
        e.preventDefault();
        store.cycleFocus(e.shiftKey ? -1 : 1);
        return;
      }

      if (e.ctrlKey && e.shiftKey && (e.key === "D" || e.key === "d")) {
        e.preventDefault();
        for (const id of store.order) {
          if (!store.windows[id].minimized) store.minimize(id);
        }
        return;
      }
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [opts]);
}
