import type { ReactNode } from "react";
import type { Metadata, Viewport } from "next";
import "./globals.css";
import {
  SITE_URL,
  SITE_NAME,
  SITE_DESCRIPTION,
  AUTHOR_NAME,
  AUTHOR_SHORT,
  GITHUB_URL,
  LINKEDIN_URL,
  EMAIL,
  DEFAULT_KEYWORDS,
} from "@/lib/site-config";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: SITE_NAME,
    template: "%s - Aan",
  },
  description: SITE_DESCRIPTION,
  keywords: DEFAULT_KEYWORDS,
  authors: [{ name: AUTHOR_NAME, url: SITE_URL }],
  creator: AUTHOR_NAME,
  applicationName: "Aan Portfolio",
  category: "portfolio",
  alternates: {
    canonical: SITE_URL,
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: SITE_URL,
    siteName: SITE_NAME,
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
    images: [
      {
        url: "/og-default.png",
        width: 1200,
        height: 630,
        alt: `${AUTHOR_NAME} - Portfolio`,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
    images: ["/og-default.png"],
  },
  robots: {
    index: true,
    follow: true,
    // Allow rich previews in Google Search (image thumbnails, full snippets).
    "max-image-preview": "large",
    "max-snippet": -1,
  },
  verification: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION
    ? { google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION }
    : undefined,
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

/**
 * schema.org Person - helps Google associate the site with its author.
 * Injected as a static JSON-LD block alongside the theme-boot script so it is
 * present in the initial HTML payload seen by crawlers.
 */
const personJsonLd = {
  "@context": "https://schema.org",
  "@type": "Person",
  name: AUTHOR_NAME,
  alternateName: AUTHOR_SHORT,
  url: SITE_URL,
  email: EMAIL,
  jobTitle: "Software Engineer",
  sameAs: [GITHUB_URL, LINKEDIN_URL],
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootScript }} />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(personJsonLd) }}
        />
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
