import type { Metadata } from "next";
import { DesktopRoot } from "@/components/os/DesktopRoot";
import { getProjectBySlug, listProjectSlugs } from "@/lib/projects";
import {
  SITE_URL,
  SITE_NAME,
  AUTHOR_NAME,
  AUTHOR_SHORT,
} from "@/lib/site-config";

interface PageProps {
  params: Promise<{ slug: string }>;
}

/**
 * Per-project URL - `/projects/<slug>/`. Auto-opens the project-viewer
 * window pre-pointed at this slug.
 *
 * Static export: `generateStaticParams` returns every slug discovered by the
 * generator, so each route is a pre-rendered HTML file.
 */
export async function generateStaticParams() {
  return listProjectSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const project = getProjectBySlug(slug);
  if (!project) return {};
  const { meta } = project;

  const canonicalUrl = `${SITE_URL}/projects/${slug}`;
  // Merge project-specific stack + tags into keywords for richer indexing.
  const keywords = [...meta.tags, ...meta.stack];

  return {
    title: meta.title, // root template appends "- Aan"
    description: meta.summary,
    keywords,
    authors: [{ name: AUTHOR_NAME, url: SITE_URL }],
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title: meta.title,
      description: meta.summary,
      type: "article",
      url: canonicalUrl,
      siteName: SITE_NAME,
      locale: "en_US",
      // Article-specific fields improve LinkedIn / Facebook preview context.
      publishedTime: `${meta.year}-01-01T00:00:00Z`,
      authors: [SITE_URL],
      tags: meta.tags,
      // Fall back to the default OG image when no project cover exists.
      images: meta.cover
        ? [{ url: meta.cover, alt: meta.title }]
        : [
            {
              url: "/og-default.png",
              width: 1200,
              height: 630,
              alt: `${meta.title} - Aan`,
            },
          ],
    },
    twitter: {
      card: "summary_large_image",
      title: meta.title,
      description: meta.summary,
      images: meta.cover ? [meta.cover] : ["/og-default.png"],
    },
  };
}

export default async function ProjectPage({ params }: PageProps) {
  const { slug } = await params;
  const project = getProjectBySlug(slug);

  // If the project doesn’t resolve (shouldn’t happen in static export since
  // generateStaticParams only emits valid slugs), render without JSON-LD.
  if (!project) {
    return <DesktopRoot autoOpen={{ id: "project-viewer", param: slug }} />;
  }

  const { meta } = project;
  const canonicalUrl = `${SITE_URL}/projects/${slug}`;
  // Combine BreadcrumbList + SoftwareSourceCode in a @graph for richer SERP
  // features (breadcrumb trail, structured code project card).
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            name: AUTHOR_SHORT,
            item: SITE_URL,
          },
          {
            "@type": "ListItem",
            position: 2,
            name: meta.title,
            item: canonicalUrl,
          },
        ],
      },
      {
        "@type": "SoftwareSourceCode",
        name: meta.title,
        description: meta.summary,
        keywords: meta.tags.join(", ") || undefined,
        author: {
          "@type": "Person",
          name: AUTHOR_NAME,
          url: SITE_URL,
        },
        dateCreated: String(meta.year),
        url: canonicalUrl,
        sameAs: meta.links.length > 0 ? meta.links.map((l) => l.href) : undefined,
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <DesktopRoot autoOpen={{ id: "project-viewer", param: slug }} />
    </>
  );
}
