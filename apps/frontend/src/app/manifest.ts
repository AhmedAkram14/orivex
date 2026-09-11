import type { MetadataRoute } from 'next';

// PWA installability (N6 in the remaining-work checklist). Root-level, not
// under [locale] (matching robots.ts/sitemap.ts) -- a single manifest
// covers every locale since start_url below carries no locale prefix and
// the app itself redirects to the visitor's preferred locale from there.
// Colors match the light-theme design tokens (--color-primary/--color-canvas,
// src/design-system/tokens/colors.css) rather than inventing new ones.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Orivex',
    short_name: 'Orivex',
    description: 'Orivex healthcare platform — book and manage consultations with verified doctors.',
    start_url: '/',
    display: 'standalone',
    background_color: '#f9fafb',
    theme_color: '#2563eb',
    icons: [
      {
        src: '/logo-transparent.png',
        sizes: '1024x1024',
        type: 'image/png',
      },
    ],
  };
}
