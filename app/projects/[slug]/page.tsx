import type { Metadata } from "next";
import { DesktopRoot } from "@/components/os/DesktopRoot";
import { getProjectBySlug, listProjectSlugs } from "@/lib/projects";

interface PageProps {
  params: Promise<{ slug: string }>;
}

/**
 * Per-project URL — `/projects/<slug>/`. Auto-opens the project-viewer
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
  return {
    title: `${meta.title} · Portfolio`,
    description: meta.summary,
    openGraph: {
      title: meta.title,
      description: meta.summary,
      type: "article",
      ...(meta.cover ? { images: [{ url: meta.cover }] } : {}),
    },
    twitter: {
      card: meta.cover ? "summary_large_image" : "summary",
      title: meta.title,
      description: meta.summary,
    },
  };
}

export default async function ProjectPage({ params }: PageProps) {
  const { slug } = await params;
  return <DesktopRoot autoOpen={{ id: "project-viewer", param: slug }} />;
}
