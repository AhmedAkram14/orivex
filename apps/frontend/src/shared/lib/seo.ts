import type { Metadata } from 'next';
import { env } from '@/shared/lib/env';
import { routing, type AppLocale } from '@/shared/i18n/routing';

export interface PageMetadataInput {
  locale: AppLocale;
  /** Path relative to the locale root, e.g. '/' or '/patients'. No locale prefix — this function adds it. */
  path: string;
  title: string;
  description: string;
}

/**
 * The one place page-level metadata is assembled — every route's
 * generateMetadata should call this rather than hand-building a Metadata
 * object, so hreflang alternates and canonical URLs are never forgotten on
 * a new page (Phase 3's SEO sub-scope: hreflang tags, localized metadata,
 * localized Open Graph). Public-surface-only in practice — the
 * authenticated portal has no real SEO surface (Phase 28's own scope
 * note) — but the helper itself doesn't need to know that.
 */
export function buildPageMetadata({ locale, path, title, description }: PageMetadataInput): Metadata {
  const normalizedPath = path === '/' ? '' : path;
  const canonicalUrl = `${env.appUrl}/${locale}${normalizedPath}`;

  const languageAlternates: Record<string, string> = {};
  for (const altLocale of routing.locales) {
    languageAlternates[altLocale] = `${env.appUrl}/${altLocale}${normalizedPath}`;
  }

  return {
    title,
    description,
    alternates: {
      canonical: canonicalUrl,
      languages: languageAlternates,
    },
    openGraph: {
      title,
      description,
      url: canonicalUrl,
      locale,
      alternateLocale: routing.locales.filter((l) => l !== locale),
    },
  };
}
