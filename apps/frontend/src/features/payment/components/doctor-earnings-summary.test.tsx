import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, render, renderHook, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { NextIntlClientProvider } from 'next-intl';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import type { DoctorEarningsTransaction } from '@/features/payment/api/types';
import { useEarningsRange } from '@/features/payment/hooks/use-earnings-range';
import type { EarningsRange } from '@/features/payment/lib/earnings';
import { server } from '@/mocks/server';
import { env } from '@/shared/lib/env';
import enMessages from '../../../../messages/en.json';
import { DoctorEarningsSummary } from './doctor-earnings-summary';

const replaceMock = vi.fn();
const pushMock = vi.fn();
let mockSearchParams = new URLSearchParams();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock, replace: replaceMock, refresh: vi.fn(), back: vi.fn(), forward: vi.fn() }),
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
  pushMock.mockClear();
  mockSearchParams = new URLSearchParams();
});
afterAll(() => server.close());

const SUMMARY_URL = `${env.apiBaseUrl}/payments/doctor/earnings-summary`;
const TRANSACTIONS_URL = `${env.apiBaseUrl}/payments/doctor/earnings-transactions`;
const RANGE_30: EarningsRange = { dateFrom: '2026-09-03', dateTo: '2026-10-03' };

const row = (id: string, createdAt: string, status: DoctorEarningsTransaction['status'], patientName = 'Mona Farouk'): DoctorEarningsTransaction => ({
  id,
  appointmentId: `appointment-${id}`,
  consultationSessionId: null,
  patientId: `patient-${id}`,
  patientName,
  amount: { amount: 400, currency: 'EGP' },
  status,
  createdAt,
});

// Three earned payments of 400 (commission 60, net 340) and one refund, across two months.
const ROWS = [
  row('a', '2026-10-02T10:00:00.000Z', 'succeeded', 'Karim Mostafa'),
  row('b', '2026-09-20T11:00:00.000Z', 'settled'),
  row('c', '2026-09-10T12:00:00.000Z', 'refunded', 'Sara Zaki'),
  row('d', '2026-09-05T09:00:00.000Z', 'settled', 'Omar Nabil'),
];

/** The summary as the backend computes it: this range's three earned payments; the previous range's one. */
function handlers({ rows = ROWS, previousNet = 680 }: { rows?: DoctorEarningsTransaction[]; previousNet?: number } = {}) {
  server.use(
    http.get(SUMMARY_URL, ({ request }) => {
      const from = new URL(request.url).searchParams.get('dateFrom');
      const cycles =
        from === '2026-08-04'
          ? previousNet > 0
            ? [{ cycleLabel: '2026-08', grossAmount: 800, commissionAmount: 120, netAmount: previousNet, transactionCount: 2 }]
            : []
          : rows.length > 0
            ? [
                { cycleLabel: '2026-10', grossAmount: 400, commissionAmount: 60, netAmount: 340, transactionCount: 1 },
                { cycleLabel: '2026-09', grossAmount: 800, commissionAmount: 120, netAmount: 680, transactionCount: 2 },
              ]
            : [];
      return HttpResponse.json({
        data: { currency: 'EGP', commissionRate: 0.15, lifetimeGrossAmount: 5000, lifetimeCommissionAmount: 750, lifetimeNetAmount: 4250, lifetimeTransactionCount: 12, cycles },
      });
    }),
    http.get(TRANSACTIONS_URL, () => HttpResponse.json({ data: rows })),
  );
}

function renderSummary(range: EarningsRange = RANGE_30, openEnded = false) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <NextIntlClientProvider locale="en" messages={enMessages} timeZone="Africa/Cairo">
        <DoctorEarningsSummary range={range} openEnded={openEnded} onRangeChange={vi.fn()} />
      </NextIntlClientProvider>
    </QueryClientProvider>,
  );
}

const summaryCard = () => document.querySelector<HTMLElement>('[data-earnings-summary]')!;

describe('DoctorEarningsSummary', () => {
  it('one summary card for the range: net against the previous period, gross, commission with its rate, consultations', async () => {
    handlers();
    renderSummary();
    const card = await waitForCard();
    // Net (340 + 680) and commission also label the where-it-went bar, so each shows twice.
    expect(await within(card).findAllByText('EGP 1,020.00')).toHaveLength(2);
    expect(within(card).getByText('EGP 1,200.00')).toBeInTheDocument(); // gross
    expect(within(card).getAllByText('EGP 180.00')).toHaveLength(2); // commission
    expect(within(card).getByText('15% of gross')).toBeInTheDocument();
    expect(within(card).getByText('3')).toBeInTheDocument();
    // 1,020 against 680 before: +50%, from the summary endpoint called with the previous 30 days.
    expect(await within(card).findByText('+50%')).toBeInTheDocument();
    expect(within(card).getByText('vs prev. 30 days')).toBeInTheDocument();
    // The only lifetime figure: one quiet line.
    expect(card.querySelector('[data-lifetime-net]')).toHaveTextContent('Lifetime net: EGP 4,250.00');
    expect(screen.queryByText(/Lifetime gross/)).not.toBeInTheDocument();
  });

  it('a neutral "—" when the previous period had nothing; no comparison at all for All time', async () => {
    handlers({ previousNet: 0 });
    const { unmount } = renderSummary();
    expect(await within(await waitForCard()).findByText('—')).toBeInTheDocument();
    unmount();

    handlers();
    renderSummary({ dateFrom: '2020-01-01', dateTo: '2026-10-03' }, true);
    const card = await waitForCard();
    expect(await within(card).findAllByText('EGP 1,020.00')).toHaveLength(2);
    expect(within(card).queryByText(/vs prev\./)).not.toBeInTheDocument();
    expect(within(card).getByText('All time')).toBeInTheDocument();
  });

  it('the chart follows the range: daily for 30 days, weekly for 90, monthly for All time', async () => {
    handlers();
    const { unmount } = renderSummary();
    expect(await screen.findAllByRole('button', { name: /: Net / })).toHaveLength(30);
    expect(document.querySelector('[data-earnings-chart]')).toHaveAttribute('data-earnings-chart', 'day');
    unmount();

    handlers();
    const second = renderSummary({ dateFrom: '2026-07-05', dateTo: '2026-10-03' });
    expect(await screen.findAllByRole('button', { name: /: Net / })).toHaveLength(13);
    expect(document.querySelector('[data-earnings-chart]')).toHaveAttribute('data-earnings-chart', 'week');
    second.unmount();

    handlers();
    renderSummary({ dateFrom: '2020-01-01', dateTo: '2026-10-03' }, true);
    // From the first month with a payment (September) to this one.
    expect(await screen.findAllByRole('button', { name: /: Net / })).toHaveLength(2);
    expect(document.querySelector('[data-earnings-chart]')).toHaveAttribute('data-earnings-chart', 'month');
  });

  it('the chart: one tab stop, arrows move between bars, each with its own figures', async () => {
    handlers();
    renderSummary();
    await screen.findByRole('heading', { name: 'Earnings over time' });
    const bars = await screen.findAllByRole('button', { name: /: Net / });
    expect(bars.filter((bar) => bar.tabIndex === 0)).toHaveLength(1);
    // The latest bar holds the tab stop; the last day with a payment (Oct 2) is it.
    const latest = bars.find((bar) => bar.hasAttribute('data-latest'))!;
    expect(latest).toHaveAttribute('data-bucket', '2026-10-02');
    latest.focus();
    expect(await screen.findByRole('tooltip')).toHaveTextContent(/Gross\s*EGP 400\.00\s*Commission\s*EGP 60\.00\s*Net\s*EGP 340\.00/);
    await userEvent.keyboard('{ArrowLeft}');
    expect(document.activeElement).toHaveAttribute('data-bucket', '2026-10-01');
  });

  it('transactions: per-row gross, commission and net; doctor-friendly status; grouped by month; the row opens the appointment', async () => {
    handlers();
    renderSummary();
    const table = await screen.findByRole('table');
    expect(within(table.querySelector('thead')!).getAllByRole('columnheader').map((cell) => cell.textContent)).toEqual(['Patient', 'Date', 'Gross', 'Commission', 'Net', 'Status']);
    // Month groups, newest first, each with its own net.
    // (Intl puts a no-break space between the currency and the amount.)
    expect(within(table).getByRole('columnheader', { name: /^October 2026 · EGP\s340\.00 net$/ })).toBeInTheDocument();
    expect(within(table).getByRole('columnheader', { name: /^September 2026 · EGP\s680\.00 net$/ })).toBeInTheDocument();

    const karim = within(table).getByRole('link', { name: 'Karim Mostafa' }).closest('tr')!;
    expect(within(karim).getByText('EGP 400.00')).toBeInTheDocument();
    expect(within(karim).getByText('EGP 60.00')).toBeInTheDocument();
    expect(within(karim).getByText('EGP 340.00')).toBeInTheDocument();
    expect(within(karim).getByText('Paid')).toBeInTheDocument();

    // A refund is listed, badged, and never split into commission or net.
    const sara = within(table).getByRole('link', { name: 'Sara Zaki' }).closest('tr')!;
    expect(within(sara).getByText('Refunded')).toBeInTheDocument();
    expect(within(sara).getAllByText('—')).toHaveLength(2);

    expect(within(table).queryByText('View appointment')).not.toBeInTheDocument();
    expect(within(table).getByRole('link', { name: 'Karim Mostafa' })).toHaveAttribute('href', '/en/doctor/appointments?highlight=appointment-a');
    await userEvent.click(within(karim).getByText('EGP 60.00'));
    expect(pushMock).toHaveBeenCalledWith('/en/doctor/appointments?highlight=appointment-a');
  });

  it('twenty rows at a time', async () => {
    const many = Array.from({ length: 25 }, (_, index) => row(`r${index}`, `2026-09-${String(5 + (index % 20)).padStart(2, '0')}T10:00:00.000Z`, 'settled'));
    handlers({ rows: many });
    renderSummary();
    const table = await screen.findByRole('table');
    expect(within(table).getAllByRole('row').filter((tableRow) => tableRow.hasAttribute('data-transaction-row'))).toHaveLength(20);
    await userEvent.click(screen.getByRole('button', { name: 'Show 5 more' }));
    expect(within(table).getAllByRole('row').filter((tableRow) => tableRow.hasAttribute('data-transaction-row'))).toHaveLength(25);
  });

  it('an empty range: the summary at zero, and a way to the schedule', async () => {
    handlers({ rows: [] });
    renderSummary();
    expect(await screen.findByText('No paid consultations in this period')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Open your schedule' })).toHaveAttribute('href', '/en/doctor/schedule');
    expect(screen.getByText('No earnings in this period')).toBeInTheDocument();
  });
});

describe('useEarningsRange', () => {
  it('seeds from the URL and writes each change back with router.replace', () => {
    mockSearchParams = new URLSearchParams('dateFrom=2026-07-05&dateTo=2026-10-03');
    const { result } = renderHook(() => useEarningsRange(), {
      wrapper: ({ children }) => (
        <NextIntlClientProvider locale="en" messages={enMessages} timeZone="Africa/Cairo">
          {children}
        </NextIntlClientProvider>
      ),
    });
    expect(result.current.range).toEqual({ dateFrom: '2026-07-05', dateTo: '2026-10-03' });
    expect(result.current.openEnded).toBe(false);
    act(() => result.current.setRange('2020-01-01', '2026-10-03'));
    expect(result.current.openEnded).toBe(true);
    expect(replaceMock).toHaveBeenCalledWith('/en/doctor/earnings?dateFrom=2020-01-01&dateTo=2026-10-03', { scroll: false });
  });
});

async function waitForCard() {
  await screen.findByText('Net earnings', { selector: 'p' });
  return summaryCard();
}
