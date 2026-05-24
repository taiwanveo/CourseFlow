import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  transpilePackages: [
    "@courseflow/core",
    "@courseflow/db",
    "@courseflow/composition",
    "@courseflow/llm",
    "@courseflow/wvp-bridge",
    "@courseflow/hf-bridge",
    "@courseflow/player",
  ],
  serverExternalPackages: [
    "pdf-parse",
    "mammoth",
    "@supabase/supabase-js",
    "@supabase/ssr",
    "bullmq",
    "ioredis",
    "edge-tts-universal",
    "@courseflow/tts",
  ],
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      canvas: false,
    };
    return config;
  },
};

export default nextConfig;
