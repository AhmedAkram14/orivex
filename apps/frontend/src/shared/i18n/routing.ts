import { defineRouting } from 'next-intl/routing';

/**
 * The binding architecture decision from Phase 3 of the frontend roadmap:
 * route-based locale segments (app/[locale]/...), not a cookie-only or
 * client-only locale concern. English and Arabic at launch, per
 * docs/03-ux-foundation.md's Arabic-first requirement — English listed
 * first only because it's the untranslated-string fallback during rollout,
 * not because it's primary.
 */
export const routing = defineRouting({
  locales: ['en', 'ar'],
  defaultLocale: 'en',
});

export type AppLocale = (typeof routing.locales)[number];

/** RTL locales — drives the `dir` attribute on <html> per locale. */
export const rtlLocales: readonly AppLocale[] = ['ar'];

export function isRtlLocale(locale: string): boolean {
  return (rtlLocales as readonly string[]).includes(locale);
}

/**
 * Each locale's own name, in its own script — deliberately NOT translated
 * (a language picker must let someone who can't read the current UI
 * language still recognize theirs, so "العربية" must read "العربية" no
 * matter which locale is currently active, never "Arabic"/"الإنجليزية").
 * Single source of truth for every language switcher in the app (landing
 * footer, doctor settings) so this doesn't drift into a translated string
 * again in one of them.
 */
export const localeNativeNames: Record<AppLocale, string> = {
  en: 'English',
  ar: 'العربية',
};
