import type { MetadataRoute } from 'next';
import { env } from '@/shared/lib/env';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        // Nothing under (protected) is meaningfully indexable anyway (it
        // 404s/redirects for a crawler with no session), but disallowing it
        // explicitly avoids a crawler wasting budget hammering login walls.
        disallow: ['/en/dashboard', '/ar/dashboard', '/en/patient', '/ar/patient', '/en/doctor', '/ar/doctor', '/en/admin', '/ar/admin'],
      },
    ],
    sitemap: `${env.appUrl}/sitemap.xml`,
  };
}
