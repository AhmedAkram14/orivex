import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import type { ReactElement } from 'react';
import { TooltipProvider } from '@/shared/ui/tooltip';
import enMessages from '../../../messages/en.json';

/**
 * The one place a test wraps a component in `NextIntlClientProvider` +
 * `QueryClientProvider` — every auth form/page test needs both (real
 * translated strings, real TanStack Query mutations against MSW), so this
 * keeps that setup in one file instead of copy-pasted per test. English
 * messages only: locale-switching itself is Phase 3's concern, already
 * covered there, not re-tested per feature.
 */
export function renderWithProviders(ui: ReactElement) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <NextIntlClientProvider locale="en" messages={enMessages} timeZone="Africa/Cairo">
        <TooltipProvider delayDuration={200}>{ui}</TooltipProvider>
      </NextIntlClientProvider>
    </QueryClientProvider>,
  );
}
