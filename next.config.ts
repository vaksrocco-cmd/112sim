import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Promptid loetakse serveris failist; Vercel peab need kaasa pakkima.
  outputFileTracingIncludes: {
    "/api/**": ["./src/lib/agents/prompts/**"],
  },
};

export default nextConfig;
