import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

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

const withNextIntl = createNextIntlPlugin('./src/shared/i18n/request.ts');

export default withNextIntl(nextConfig);
