import createMDX from "@next/mdx";
import remarkGfm from "remark-gfm";
import remarkFrontmatter from "remark-frontmatter";
import remarkMdxFrontmatter from "remark-mdx-frontmatter";

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "export",
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
  pageExtensions: ["ts", "tsx", "mdx"],
  reactStrictMode: true,
  // We intentionally avoid server-only features (route handlers, ISR, middleware)
  // so the build is fully portable as a static artifact (`out/`).
};

const withMDX = createMDX({
  options: {
    remarkPlugins: [
      remarkGfm,
      remarkFrontmatter,
      [remarkMdxFrontmatter, { name: "meta" }],
    ],
    rehypePlugins: [],
  },
});

export default withMDX(nextConfig);
