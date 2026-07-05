import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Blog posts are read from the filesystem at runtime — make sure the md files
  // are traced into the serverless bundle on Vercel.
  outputFileTracingIncludes: {
    "/blog": ["./content/blog/**/*"],
    "/blog/[slug]": ["./content/blog/**/*"],
  },
};

export default nextConfig;
