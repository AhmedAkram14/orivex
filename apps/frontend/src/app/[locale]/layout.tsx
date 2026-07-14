import type { Metadata } from 'next';
import { hasLocale, NextIntlClientProvider } from 'next-intl';
import { notFound } from 'next/navigation';
import { SessionProvider } from '@/features/auth/providers/session-provider';
import { AppProviders } from '@/shared/providers/app-providers';
import { MockProvider } from '@/shared/providers/mock-provider';
import { ThemeScript } from '@/shared/providers/theme-provider';
import { routing, isRtlLocale, type AppLocale } from '@/shared/i18n/routing';
import { buildPageMetadata } from '@/shared/lib/seo';

import '../globals.css';

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
    <html lang={locale} dir={isRtlLocale(locale) ? 'rtl' : 'ltr'}>
      <head>
        <ThemeScript />
      </head>
      <body className="antialiased" suppressHydrationWarning>
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
