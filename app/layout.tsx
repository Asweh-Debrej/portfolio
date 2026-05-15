import type { ReactNode } from "react";
import type { Metadata, Viewport } from "next";
import "./globals.css";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://portfolio.local";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Aan — Portfolio",
    template: "%s — Aan",
  },
  description:
    "An interactive desktop-style portfolio. Browse projects through a draggable, resizable window manager built in the browser.",
  keywords: [
    "portfolio",
    "software engineering",
    "web development",
    "Next.js",
    "TypeScript",
    "desktop OS",
  ],
  authors: [{ name: "Aan" }],
  creator: "Aan",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: SITE_URL,
    siteName: "Aan — Portfolio",
    title: "Aan — Portfolio",
    description: "An interactive desktop-style portfolio.",
    images: [
      {
        url: "/og-default.png",
        width: 1200,
        height: 630,
        alt: "Aan — Portfolio",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Aan — Portfolio",
    description: "An interactive desktop-style portfolio.",
    images: ["/og-default.png"],
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f5f7fb" },
    { media: "(prefers-color-scheme: dark)", color: "#0c1224" },
  ],
  width: "device-width",
  initialScale: 1,
};

/**
 * Inline pre-paint script:
 *  - Reads persisted settings store from localStorage.
 *  - Applies `.dark` class to <html> before React hydrates, preventing FOUC.
 *  - Falls back to OS preference (`prefers-color-scheme: dark`).
 *  - Defensive against malformed JSON / missing keys (early visit).
 */
const themeBootScript = `
(function() {
  try {
    var raw = localStorage.getItem('aan:settings');
    var theme = null;
    if (raw) {
      var parsed = JSON.parse(raw);
      theme = parsed && parsed.state && parsed.state.theme;
    }
    if (!theme) {
      theme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    if (theme === 'dark') document.documentElement.classList.add('dark');
  } catch (_) { /* swallow */ }
})();
`;

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootScript }} />
      </head>
      <body>
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[9999] focus:rounded focus:bg-[var(--color-accent)] focus:px-3 focus:py-2 focus:text-[var(--color-accent-fg)]"
        >
          Skip to main content
        </a>
        {children}
      </body>
    </html>
  );
}
