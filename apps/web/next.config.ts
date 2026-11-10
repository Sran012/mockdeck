import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  agentRules: false,
  transpilePackages: ["@mockdeck/editor", "@mockdeck/render", "@mockdeck/scene"],
};

export default nextConfig;
