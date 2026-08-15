import { IBM_Plex_Sans, IBM_Plex_Sans_Arabic } from 'next/font/google';

// ORIVEX Design System — typeface decision (Phase 6A). `next/font/google`
// self-hosts these at build time (no manual asset fetch, no external
// runtime request, no CLS) and exposes each as a CSS custom property
// consumed by `tokens/typography.css`'s `--font-sans-latin`/
// `--font-sans-arabic` — never referenced directly by components, per that
// file's own "swap the vendor in one place" contract.
//
// IBM Plex Sans + IBM Plex Sans Arabic: a single type system designed by
// one foundry for multi-script consistency (matched weights/proportions
// across scripts, unlike pairing two unrelated Latin/Arabic families),
// distinctive and professional rather than the ubiquitous Inter/system-UI
// look, and calm/legible enough for a clinical product's data-dense UI.
export const plexSansLatin = IBM_Plex_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-ibm-plex-sans',
  display: 'swap',
});

export const plexSansArabic = IBM_Plex_Sans_Arabic({
  subsets: ['arabic'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-ibm-plex-sans-arabic',
  display: 'swap',
});
