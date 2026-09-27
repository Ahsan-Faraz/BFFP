import type { NextConfig } from "next";
import createMDX from "@next/mdx";

// Topic notes live in /content/*.mdx and are imported by app/[topic]/page.tsx,
// so MDX only needs to be compiled as an import, not used as a page extension.
const nextConfig: NextConfig = {};

const withMDX = createMDX({
  options: {
    // Plugins are passed by name so Turbopack can load them.
    remarkPlugins: ["remark-gfm"],
  },
});

export default withMDX(nextConfig);
