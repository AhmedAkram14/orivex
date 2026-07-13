import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // AssetModule serves media via signed, time-limited S3 URLs
  // (docs/10-backend-architecture.md's AssetModule entry) -- the actual
  // bucket/CDN domain isn't chosen yet (no S3 provider has been selected
  // for production, per the backend's own NotConfigured*Adapter pattern).
  // Add the real domain here once one exists; next/image will reject any
  // remote image host not listed below.
  images: {
    remotePatterns: [],
  },
};

export default nextConfig;
