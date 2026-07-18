import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';
import { withSentryConfig } from '@sentry/nextjs';

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

// withSentryConfig only uploads source maps / wraps build output when a
// Sentry auth token + org/project are configured (see docs/15-observability.md);
// with none of those set it's a harmless passthrough, matching this file's
// existing "optional integration" pattern.
export default withSentryConfig(withNextIntl(nextConfig), {
  silent: true,
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  disableLogger: true,
});
