import type { NextConfig } from "next";

// STATIC_EXPORT=1 builds a static site for GitHub Pages (no API routes there —
// the advisory panel silently uses its canned fallback). Local dev and normal
// builds are unaffected.
const isStaticExport = process.env.STATIC_EXPORT === "1";

const nextConfig: NextConfig = isStaticExport
  ? {
      output: "export",
      basePath: "/Agnipath",
      images: { unoptimized: true },
    }
  : {};

export default nextConfig;
