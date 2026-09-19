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
  it('shows the reverse cross-link back to Reports, matching the Reports->Earnings idiom', async () => {
    renderPage();

    const link = await screen.findByRole('link', { name: /See your reports for this period/ });
    expect(link).toHaveAttribute('href', '/en/doctor/reports');
  });

  it('renders the date-range picker and export button (detailed behavior covered by doctor-earnings-summary.test.tsx)', async () => {
    renderPage();

    await screen.findByLabelText('From');
    expect(screen.getByLabelText('To')).toBeInTheDocument();
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
    renderPage();

    expect(await screen.findByText('No earnings yet')).toBeInTheDocument();
    expect(screen.getByText('No transactions yet')).toBeInTheDocument();
  });
});
