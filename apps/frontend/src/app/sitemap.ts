import type { MetadataRoute } from 'next';
import { env } from '@/shared/lib/env';
import { routing } from '@/shared/i18n/routing';

// Only genuinely public, unauthenticated pages -- everything under
// (protected) requires a session and has nothing for an anonymous crawler
// to index (see robots.ts).
const PUBLIC_PATHS = ['', '/login', '/register', '/forgot-password'] as const;

export default function sitemap(): MetadataRoute.Sitemap {
  return routing.locales.flatMap((locale) =>
    PUBLIC_PATHS.map((path) => ({
      url: `${env.appUrl}/${locale}${path}`,
      lastModified: new Date(),
      changeFrequency: path === '' ? ('weekly' as const) : ('monthly' as const),
      priority: path === '' ? 1 : 0.5,
    })),
  );
}
