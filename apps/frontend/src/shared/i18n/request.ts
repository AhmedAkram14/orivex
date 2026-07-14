import { getRequestConfig } from 'next-intl/server';
import { hasLocale } from 'next-intl';
import { routing } from '@/shared/i18n/routing';

/**
 * Server-side translation resolution (Phase 3.4.1: Server Components
 * resolve translated strings on the server, not via a client-side lookup
 * table). Namespaced by locale file today (messages/en.json,
 * messages/ar.json) — per-feature namespace splitting (Translation
 * Management scope) happens once a second feature actually needs its own
 * namespace, not speculatively.
 */
export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = hasLocale(routing.locales, requested) ? requested : routing.defaultLocale;

  return {
    locale,
    messages: (await import(`../../../messages/${locale}.json`)).default,
  };
});
