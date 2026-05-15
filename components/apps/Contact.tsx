"use client";

import { Mail, Github, Linkedin, Globe, ExternalLink } from "lucide-react";
import type { AppProps } from "@/lib/registry";

interface Link {
  label: string;
  href: string;
  icon: React.ReactNode;
  description?: string;
}

const LINKS: Link[] = [
  {
    label: "Email",
    href: "mailto:aswehdebrej@gmail.com",
    icon: <Mail size={18} />,
    description: "aswehdebrej@gmail.com",
  },
  {
    label: "GitHub",
    href: "https://github.com/Asweh-Debrej",
    icon: <Github size={18} />,
    description: "@Asweh-Debrej",
  },
  {
    label: "LinkedIn",
    href: "https://linkedin.com/in/muhamadfarhansyakir",
    icon: <Linkedin size={18} />,
    description: "in/muhamadfarhansyakir",
  },
  {
    label: "Website",
    href: "https://asweh.com",
    icon: <Globe size={18} />,
    description: "asweh.com",
  },
];

export default function Contact(_props: AppProps) {
  return (
    <div className="flex h-full flex-col gap-4 p-6">
      <header>
        <h1 className="text-xl font-semibold">Get in touch</h1>
        <p className="text-sm text-[var(--color-fg-muted)]">
          I&apos;m always open to collaboration and interesting work.
        </p>
      </header>
      <ul className="flex flex-col gap-2">
        {LINKS.map((l) => (
          <li key={l.label}>
            <a
              href={l.href}
              target="_blank"
              rel="noreferrer noopener"
              className="group flex items-center gap-3 rounded-lg border border-[var(--color-border)] p-3 transition-colors hover:bg-[color-mix(in_oklch,var(--color-fg)_5%,transparent)]"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-md bg-[color-mix(in_oklch,var(--color-fg)_8%,transparent)] text-[var(--color-fg)]">
                {l.icon}
              </span>
              <span className="flex-1">
                <span className="block text-sm font-medium">{l.label}</span>
                {l.description && (
                  <span className="block text-xs text-[var(--color-fg-muted)]">{l.description}</span>
                )}
              </span>
              <ExternalLink
                size={14}
                className="text-[var(--color-fg-muted)] opacity-0 transition-opacity group-hover:opacity-100"
              />
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
