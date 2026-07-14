import type { Preview } from '@storybook/react';
import { NextIntlClientProvider } from 'next-intl';
import React from 'react';
import { SessionProvider } from '../src/features/auth/providers/session-provider';
import { isRtlLocale, type AppLocale } from '../src/shared/i18n/routing';
import { AppProviders } from '../src/shared/providers/app-providers';
import enMessages from '../messages/en.json';
import arMessages from '../messages/ar.json';

import '../src/app/globals.css';

const messagesByLocale: Record<AppLocale, typeof enMessages> = {
  en: enMessages,
  ar: arMessages,
};

// Starts the same MSW browser worker the real app uses (opt-in via
// NEXT_PUBLIC_ENABLE_API_MOCKS there; always-on here, since every story
// that touches `authApi` needs a mock backend and Storybook has no real
// one to fall back to). `bypass` for anything unhandled, rather than
// erroring the whole story on an unmocked request.
if (typeof window !== 'undefined') {
  import('../src/mocks/browser').then(({ worker }) => worker.start({ onUnhandledRequest: 'bypass' }));
}

/**
 * Global toolbar controls for locale and theme, since Phase 1's
 * Definition of Done requires every component to be verifiable in both
 * directions (LTR/RTL) and both themes (light/dark) — not just the
 * default. Direction is derived from the selected locale, exactly as it is
 * in the real app (`app/[locale]/layout.tsx`'s `isRtlLocale` check) —
 * there is no independent "direction" control, since direction is never
 * independent of locale in production. `next-intl`'s NextIntlClientProvider
 * is wired here so any component using `useTranslations` renders real
 * translated strings, not a runtime error, in every story.
 */
const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    a11y: {
      test: 'error',
    },
    backgrounds: { disable: true },
  },
  globalTypes: {
    locale: {
      name: 'Locale',
      description: 'Locale (drives direction and translated strings)',
      defaultValue: 'en',
      toolbar: {
        icon: 'globe',
        items: [
          { value: 'en', title: 'English (LTR)' },
          { value: 'ar', title: 'العربية (RTL)' },
        ],
      },
    },
    theme: {
      name: 'Theme',
      description: 'Color theme',
      defaultValue: 'light',
      toolbar: {
        icon: 'circlehollow',
        items: [
          { value: 'light', title: 'Light' },
          { value: 'dark', title: 'Dark' },
        ],
      },
    },
  },
  decorators: [
    (Story, context) => {
      const locale = (context.globals.locale ?? 'en') as AppLocale;
      const theme = context.globals.theme ?? 'light';
      const direction = isRtlLocale(locale) ? 'rtl' : 'ltr';
      return (
        <div dir={direction} lang={locale} data-theme={theme} className="bg-canvas p-6 text-text-primary">
          <NextIntlClientProvider locale={locale} messages={messagesByLocale[locale]}>
            <AppProviders>
              <SessionProvider>
                <Story />
              </SessionProvider>
            </AppProviders>
          </NextIntlClientProvider>
        </div>
      );
    },
  ],
};

export default preview;
