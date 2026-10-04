import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { http, HttpResponse } from 'msw';
import DoctorEarningsPage from './page';
import { server } from '@/mocks/server';
import { env } from '@/shared/lib/env';
import { AuthContext } from '@/shared/auth/auth-context';
import type { AuthState } from '@/shared/auth/types';
import enMessages from '../../../../../../messages/en.json';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn(), back: vi.fn(), forward: vi.fn() }),
  usePathname: () => '/doctor/earnings',
  useParams: () => ({ locale: 'en' }),
  useSearchParams: () => new URLSearchParams(),
  redirect: vi.fn(),
  permanentRedirect: vi.fn(),
  RedirectType: { push: 'push', replace: 'replace' },
}));

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

const doctorState: AuthState = {
  status: 'authenticated',
  user: { id: '1', email: 'doctor@orivex.dev', fullName: 'Dr. Sarah Ahmed', roles: ['doctor'] },
};

const SUMMARY_URL = `${env.apiBaseUrl}/payments/doctor/earnings-summary`;
const TRANSACTIONS_URL = `${env.apiBaseUrl}/payments/doctor/earnings-transactions`;

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <NextIntlClientProvider locale="en" messages={enMessages} timeZone="Africa/Cairo">
        <AuthContext.Provider value={doctorState}>
          <DoctorEarningsPage />
        </AuthContext.Provider>
      </NextIntlClientProvider>
    </QueryClientProvider>,
  );
}

describe('DoctorEarningsPage', () => {
  it('carries the cross-link to Reports as a header action', async () => {
    renderPage();

    const link = await screen.findByRole('link', { name: /View reports/ });
    expect(link).toHaveAttribute('href', '/en/doctor/reports');
  });

  it('renders the date-range picker and export button (detailed behavior covered by doctor-earnings-summary.test.tsx)', async () => {
    renderPage();

    // The shared range toolbar: presets first, the From/To inputs inside the custom-range popover.
    await screen.findByRole('button', { name: '30 days' });
    expect(screen.getByRole('button', { name: 'Custom range' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Export CSV/ })).toBeInTheDocument();
  });

  it('still renders an honest zero state when a real doctor genuinely has no earnings history', async () => {
    server.use(
      http.get(SUMMARY_URL, () =>
        HttpResponse.json({
          data: {
            currency: null,
            commissionRate: 0.15,
            lifetimeGrossAmount: 0,
            lifetimeCommissionAmount: 0,
            lifetimeNetAmount: 0,
            lifetimeTransactionCount: 0,
            cycles: [],
          },
        }),
      ),
    );
    server.use(http.get(TRANSACTIONS_URL, () => HttpResponse.json({ data: [] })));
    renderPage();

    expect(await screen.findByText('No earnings in this period')).toBeInTheDocument();
    expect(await screen.findByText('No paid consultations in this period')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Open your schedule' })).toHaveAttribute('href', '/en/doctor/schedule');
  });
});
