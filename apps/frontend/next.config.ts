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

  // Proxies /auth/* through this app's own origin to the backend
  // (orivex-backend.onrender.com), rather than the browser calling it
  // cross-site directly. Only /auth/* ever sets/reads the httpOnly
  // refresh-token cookie (AuthenticationModule) -- everything else
  // authenticates via the in-memory bearer token and is unaffected by
  // this. The frontend (orivex-eg.vercel.app) and backend are different
  // eTLD+1 domains, so that cookie is genuinely cross-site; WebKit (Safari,
  // and every iOS browser, which is required to use WebKit under Apple's
  // rules) blocks third-party cookies by default regardless of correct
  // SameSite=None/Secure attributes, so it never reliably persisted there
  // -- "sign in again on every refresh," but only on Safari/iOS, never on
  // desktop Chrome/Firefox/Edge. Routing this one prefix through the
  // frontend's own origin makes the cookie first-party instead. Applies
  // in dev too (next dev's server honors rewrites the same way), so local
  // behavior always matches production.
  async rewrites() {
    const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/+$/, '');
    if (!apiBaseUrl) {
      return [];
    }
    return [{ source: '/auth/:path*', destination: `${apiBaseUrl}/auth/:path*` }];
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
