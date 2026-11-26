import type { NextConfig } from "next";

// Cache Components is off on purpose: every screen after login is per-user and reads the
// session cookie, so a static shell buys little and would force Suspense around each read.
const nextConfig: NextConfig = {
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
