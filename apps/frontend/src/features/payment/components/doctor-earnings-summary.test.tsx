import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NextIntlClientProvider } from 'next-intl';
import { http, HttpResponse } from 'msw';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { DoctorEarningsSummary } from './doctor-earnings-summary';
import { server } from '@/mocks/server';
import { env } from '@/shared/lib/env';
import enMessages from '../../../../messages/en.json';

const replaceMock = vi.fn();
let mockSearchParams = new URLSearchParams();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: replaceMock, refresh: vi.fn(), back: vi.fn(), forward: vi.fn() }),
  usePathname: () => '/doctor/earnings',
  useParams: () => ({ locale: 'en' }),
  useSearchParams: () => mockSearchParams,
  redirect: vi.fn(),
  permanentRedirect: vi.fn(),
  RedirectType: { push: 'push', replace: 'replace' },
}));

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => {
  server.resetHandlers();
  replaceMock.mockClear();
  mockSearchParams = new URLSearchParams();
});
afterAll(() => server.close());

const SUMMARY_URL = `${env.apiBaseUrl}/payments/doctor/earnings-summary`;
const TRANSACTIONS_URL = `${env.apiBaseUrl}/payments/doctor/earnings-transactions`;

// Lifetime figures are fixed regardless of the requested range (the actual
// backend contract post-Phase-0 fix) -- only `cycles` varies with the
// request's `dateFrom`/`dateTo`, so this fixture proves the frontend never
// re-derives the lifetime tiles from anything range-dependent.
function summaryHandler() {
  return http.get(SUMMARY_URL, ({ request }) => {
    const url = new URL(request.url);
    const dateFrom = url.searchParams.get('dateFrom') ?? '';
    // A distinct, range-dependent cycle count so a change in the requested
    // range is observably reflected somewhere in the response, while
    // lifetime figures below never vary.
    const cycles = dateFrom.startsWith('2020')
      ? [{ cycleLabel: '2020-01', grossAmount: 500, commissionAmount: 75, netAmount: 425, transactionCount: 9 }]
      : [{ cycleLabel: '2026-08', grossAmount: 200, commissionAmount: 30, netAmount: 170, transactionCount: 2 }];
    return HttpResponse.json({
      data: {
        currency: 'EGP',
        commissionRate: 0.15,
        lifetimeGrossAmount: 9999,
        lifetimeCommissionAmount: 1500,
        lifetimeNetAmount: 8499,
        lifetimeTransactionCount: 42,
        cycles,
      },
    });
  });
}

function transactionsHandler(rows: unknown[] = []) {
  return http.get(TRANSACTIONS_URL, () => HttpResponse.json({ data: rows }));
}

function renderComponent() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <NextIntlClientProvider locale="en" messages={enMessages} timeZone="Africa/Cairo">
        <DoctorEarningsSummary />
      </NextIntlClientProvider>
    </QueryClientProvider>,
  );
}

describe('DoctorEarningsSummary', () => {
  it('renders the lifetime tiles from the single shared summary call', async () => {
    server.use(summaryHandler(), transactionsHandler());
    renderComponent();

    expect(await screen.findByText('EGP 8,499.00')).toBeInTheDocument();
    expect(screen.getByText('EGP 9,999.00')).toBeInTheDocument();
    expect(screen.getByText('42')).toBeInTheDocument();
  });

  // Critical regression test (plan decision 7 / Phase 0 bug fix): the
  // lifetime tiles must NEVER change value as the date range picker moves,
  // even though the cycles section (period-scoped) does change. Both come
  // from the SAME `useDoctorEarningsSummary({dateFrom, dateTo})` call.
  it('keeps the lifetime tiles unchanged when the date range picker moves, while the cycles section updates', async () => {
    server.use(summaryHandler(), transactionsHandler());
    const user = userEvent.setup();
    renderComponent();

    expect(await screen.findByText('EGP 8,499.00')).toBeInTheDocument();
    expect(screen.getByText('EGP 9,999.00')).toBeInTheDocument();
    expect(screen.getByText('42')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument(); // 2026-08 cycle's transactionCount

    await user.click(screen.getByRole('button', { name: 'All time' }));

    // The period-scoped cycles table now reflects the "All time" range's
    // distinct fixture (its own transactionCount of 9)...
    await waitFor(() => expect(screen.getByText('9')).toBeInTheDocument());

    // ...while the lifetime tiles above stay exactly as they were.
    expect(screen.getByText('EGP 8,499.00')).toBeInTheDocument();
    expect(screen.getByText('EGP 9,999.00')).toBeInTheDocument();
    expect(screen.getByText('42')).toBeInTheDocument();
  });

  it('renders the drill-down table with a Refunded row visibly badged, and shows no client-side sum row', async () => {
    server.use(
      summaryHandler(),
      transactionsHandler([
        {
          id: 'txn-1',
          appointmentId: 'appt-1',
          consultationSessionId: 'session-1',
          patientId: 'patient-1',
          patientName: 'Amina Youssef',
          amount: { amount: 300, currency: 'EGP' },
          status: 'succeeded',
          createdAt: '2026-08-05T10:00:00.000Z',
        },
        {
          id: 'txn-2',
          appointmentId: 'appt-2',
          consultationSessionId: 'session-2',
          patientId: 'patient-2',
          patientName: 'Karim Adel',
          amount: { amount: 150, currency: 'EGP' },
          status: 'refunded',
          createdAt: '2026-08-06T10:00:00.000Z',
        },
      ]),
    );
    renderComponent();

    expect(await screen.findByText('Amina Youssef')).toBeInTheDocument();
    expect(screen.getByText('Karim Adel')).toBeInTheDocument();

    const refundedBadge = screen.getByText('Refunded');
    expect(refundedBadge).toBeInTheDocument();
    // `danger` badge variant styling (bg-danger-subtle) -- visibly distinct
    // from the `success` variant used for succeeded rows.
    expect(refundedBadge.className).toContain('danger');

    // No aggregate/total row anywhere in the drill-down section -- totals
    // come exclusively from the summary endpoint's own lifetime figures.
    expect(screen.queryByText(/total/i)).not.toBeInTheDocument();
  });

  it('renders the date-range picker and export button, and writes the URL via router.replace on change', async () => {
    server.use(summaryHandler(), transactionsHandler());
    const user = userEvent.setup();
    renderComponent();

    await screen.findByText('EGP 8,499.00');
    expect(screen.getByRole('button', { name: /Export CSV/ })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '7 days' }));

    await waitFor(() => expect(replaceMock).toHaveBeenCalled());
    expect(String(replaceMock.mock.calls.at(-1)?.[0])).toContain('dateFrom=');
  });

  it('shows the payout-honesty line near the lifetime tiles', async () => {
    server.use(summaryHandler(), transactionsHandler());
    renderComponent();

    await screen.findByText('EGP 8,499.00');
    expect(
      screen.getByText(
        'These figures reflect earnings recorded on this platform, not confirmation that funds have been transferred to your account.',
      ),
    ).toBeInTheDocument();
  });
});
