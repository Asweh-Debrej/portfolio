import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site-config";
import { listProjectSlugs } from "@/lib/projects";

// Required for `output: "export"` - sitemap is fully static.
export const dynamic = "force-static";

/**
 * `sitemap.xml` generator - emits the root URL and every per-project route.
 * Since the site is fully static, all entries get `changefreq=monthly`.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return [
    {
      url: `${SITE_URL}/`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 1,
    },
    ...listProjectSlugs().map((slug) => ({
      url: `${SITE_URL}/projects/${slug}/`,
      lastModified: now,
      changeFrequency: "monthly" as const,
      priority: 0.8,
    })),
  ];
}
