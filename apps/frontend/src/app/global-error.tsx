'use client';

import * as Sentry from '@sentry/nextjs';
import { useEffect } from 'react';

/**
 * Last-resort fallback: only renders if the root layout itself
 * (app/[locale]/layout.tsx) throws — meaning NextIntlClientProvider and
 * every other provider may not be mounted. Deliberately plain, hardcoded
 * English, and framework-independent (must supply its own <html>/<body>,
 * replacing the entire root layout) — there is no locale/theme/toast
 * context available to lean on at this level.
 */
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en">
      <body style={{ fontFamily: 'sans-serif', padding: '2rem' }}>
        {/* Plain <img> against a static public asset, not the shared
            <Logo> component -- this fallback must render with zero
            dependency on the app's Tailwind/theme/next-intl context, per
            this file's own doc comment, but a public/ file is always
            servable regardless. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/orivex-icon.png" alt="ORIVEX" width={36} height={36} style={{ marginBottom: '1rem' }} />
        <h1>Something went wrong</h1>
        <p>Please try again.</p>
        <button type="button" onClick={reset}>
          Try again
        </button>
      </body>
    </html>
  );
}
