import type { Metadata } from 'next';
import { hasLocale, NextIntlClientProvider } from 'next-intl';
import { Noto_Naskh_Arabic } from 'next/font/google';
import { notFound } from 'next/navigation';
import { SessionProvider } from '@/features/auth/providers/session-provider';
import { AppProviders } from '@/shared/providers/app-providers';
import { MockProvider } from '@/shared/providers/mock-provider';
import { ThemeScript } from '@/shared/providers/theme-provider';
import { routing, isRtlLocale, type AppLocale } from '@/shared/i18n/routing';
import { buildPageMetadata } from '@/shared/lib/seo';

import '../globals.css';

// Self-hosted by Next.js at build time (no runtime request to Google Fonts,
// so this carries none of the third-party-request/licensing concerns
// typography.css's own comment used to flag) -- exposed as a CSS variable
// consumed by `--font-sans-arabic` in typography.css, never referenced by
// name outside that one token.
const notoNaskhArabic = Noto_Naskh_Arabic({
  subsets: ['arabic'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-noto-naskh-arabic',
  display: 'swap',
});

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return buildPageMetadata({
    locale: locale as AppLocale,
    path: '/',
    title: 'Orivex',
    description: 'Orivex healthcare platform.',
  });
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  return (
    <html lang={locale} dir={isRtlLocale(locale) ? 'rtl' : 'ltr'} suppressHydrationWarning>
      <head>
        <ThemeScript />
      </head>
      <body className={`antialiased ${notoNaskhArabic.variable}`} suppressHydrationWarning>
        <NextIntlClientProvider>
          <MockProvider>
            <AppProviders>
              <SessionProvider>{children}</SessionProvider>
            </AppProviders>
          </MockProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
