import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NextIntlClientProvider } from 'next-intl';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { http, HttpResponse } from 'msw';
import DoctorReportsPage from './page';
import { server } from '@/mocks/server';
import { env } from '@/shared/lib/env';
import { AuthContext } from '@/shared/auth/auth-context';
import type { AuthState } from '@/shared/auth/types';
import enMessages from '../../../../../../messages/en.json';

const replaceMock = vi.fn();
let mockSearchParams = new URLSearchParams();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: replaceMock, refresh: vi.fn(), back: vi.fn(), forward: vi.fn() }),
  usePathname: () => '/doctor/reports',
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

const doctorState: AuthState = {
  status: 'authenticated',
  user: { id: '1', email: 'doctor@orivex.dev', fullName: 'Dr. Sarah Ahmed', roles: ['doctor'] },
};

const ANALYTICS_URL = `${env.apiBaseUrl}/appointments/doctor/reports-analytics`;

function jsonAnalytics(overrides: Record<string, unknown> = {}) {
  return HttpResponse.json({
    data: {
      totalAppointments: 62,
      completed: 47,
      cancelled: 5,
      noShow: 3,
      pendingApproval: 2,
      upcoming: 4,
      expired: 1,
      averageRating: 4.6,
      reviewCount: 41,
      byBucket: [
        { bucket: '2026-09-10', count: 2 },
        { bucket: '2026-09-11', count: 3 },
      ],
      ...overrides,
    },
  });
}

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <NextIntlClientProvider locale="en" messages={enMessages} timeZone="Africa/Cairo">
        <AuthContext.Provider value={doctorState}>
          <DoctorReportsPage />
        </AuthContext.Provider>
      </NextIntlClientProvider>
    </QueryClientProvider>,
  );
}

describe('DoctorReportsPage', () => {
  it('renders all 7 reconciled tiles with the locked drill-down hrefs into Schedule', async () => {
    renderPage();

    expect(await screen.findByText('62')).toBeInTheDocument();
    expect(screen.getByText('Total appointments')).toBeInTheDocument();
    expect(screen.getByText('Completed')).toBeInTheDocument();
    expect(screen.getByText('Cancelled')).toBeInTheDocument();
    expect(screen.getByText('No-show')).toBeInTheDocument();
    expect(screen.getByText('Pending approval')).toBeInTheDocument();
    expect(screen.getByText('Upcoming')).toBeInTheDocument();
    expect(screen.getByText('Average rating')).toBeInTheDocument();

    // Verified against the real Schedule page: it reads `?status=` from the
    // URL but never `?from=`/`?to=` (those come from local `weekOffset`
    // state), so every drill-down href below carries only `?status=`.
    expect(screen.getByText('Completed').closest('a')).toHaveAttribute('href', '/en/doctor/schedule?status=completed');
    expect(screen.getByText('Cancelled').closest('a')).toHaveAttribute('href', '/en/doctor/schedule?status=cancelled');
    expect(screen.getByText('No-show').closest('a')).toHaveAttribute('href', '/en/doctor/schedule?status=no_show');
    expect(screen.getByText('Pending approval').closest('a')).toHaveAttribute('href', '/en/doctor/schedule?status=requested');
    // Upcoming spans 3 underlying statuses -- no single `?status=` value fits,
    // so it links to Schedule with the date filter alone.
    expect(screen.getByText('Upcoming').closest('a')).toHaveAttribute('href', '/en/doctor/schedule');
    // Total and Rating have no matching Schedule status at all.
    expect(screen.getByText('Total appointments').closest('a')).toBeNull();
    expect(screen.getByText('Average rating').closest('a')).toBeNull();
  });

  it('shows the visible H2 tiles heading and the Expired-reconciliation footnote under Total', async () => {
    renderPage();

    await screen.findByText('62');
    const heading = screen.getByRole('heading', { level: 2, name: 'Appointment breakdown' });
    expect(heading).toBeInTheDocument();
    expect(screen.getByText('1 expired, never answered — included in total')).toBeInTheDocument();
  });

  it('shows the low-data rating message below the 5-review threshold instead of a bare number', async () => {
    server.use(http.get(ANALYTICS_URL, () => jsonAnalytics({ reviewCount: 3 })));
    renderPage();

    expect(await screen.findByText('Not enough ratings yet (only 3)')).toBeInTheDocument();
  });

  it('shows the real average once at/above the 5-review threshold', async () => {
    renderPage();

    expect(await screen.findByText('4.6')).toBeInTheDocument();
    expect(screen.getByText('41 Ratings')).toBeInTheDocument();
  });

  it('deep-links with ?dateFrom=&dateTo= and reflects them in the date-range inputs', async () => {
    mockSearchParams = new URLSearchParams('dateFrom=2026-08-01&dateTo=2026-08-31');
    renderPage();

    await screen.findByText('62', {}, { timeout: 10000 });
    expect(screen.getByLabelText('From')).toHaveValue('2026-08-01');
    expect(screen.getByLabelText('To')).toHaveValue('2026-08-31');
  }, 15000);

  it('defaults to the last 30 days when the URL has no date params', async () => {
    renderPage();
    await screen.findByText('62');

    const fromInput = screen.getByLabelText('From') as HTMLInputElement;
    const toInput = screen.getByLabelText('To') as HTMLInputElement;
    expect(fromInput.value).not.toBe('');
    expect(toInput.value).not.toBe('');
    expect(new Date(toInput.value).getTime() - new Date(fromInput.value).getTime()).toBeCloseTo(30 * 24 * 60 * 60 * 1000, -5);
  });

  it('clicking a preset updates the inputs and writes the URL via router.replace', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('62');

    await user.click(screen.getByRole('button', { name: '7 days' }));

    await waitFor(() => expect(replaceMock).toHaveBeenCalled());
    expect(String(replaceMock.mock.calls.at(-1)?.[0])).toContain('dateFrom=');
  });

  it('toggles the delta badges on/off with "compare previous period"', async () => {
    const user = userEvent.setup();
    server.use(
      http.get(ANALYTICS_URL, ({ request }) => {
        const compare = new URL(request.url).searchParams.get('comparePrevious') === 'true';
        return jsonAnalytics(compare ? { previousPeriod: { totalAppointments: 58, completed: 42, cancelled: 7, noShow: 3 } } : {});
      }),
    );
    renderPage();
    await screen.findByText('62');

    expect(screen.queryByText(/%$/)).not.toBeInTheDocument();

    await user.click(screen.getByLabelText('Compare to previous period'));

    await waitFor(() => expect(screen.getAllByText(/%$/).length).toBeGreaterThan(0));
  });

  it('renders the trend chart empty state when byBucket is empty, and a populated chart otherwise', async () => {
    server.use(http.get(ANALYTICS_URL, () => jsonAnalytics({ byBucket: [] })));
    renderPage();

    // The trend chart is `next/dynamic`-loaded (ssr:false) below the tile
    // grid, so it resolves after the tiles' own query -- a longer timeout
    // here isn't masking a real wait, just giving the lazy chunk room to
    // load under a heavily parallel test run.
    expect(await screen.findByText('Nothing to plot yet', {}, { timeout: 10000 })).toBeInTheDocument();
  }, 15000);

  it('renders the export button wired with the current filter and the Earnings cross-link', async () => {
    renderPage();
    await screen.findByText('62');

    expect(screen.getByRole('button', { name: /Export CSV/ })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /See your earnings for this period/ })).toHaveAttribute('href', '/en/doctor/earnings');
  });

  it('still renders an honest zero-count state when a real doctor genuinely has no appointment history', async () => {
    server.use(
      http.get(ANALYTICS_URL, () =>
        jsonAnalytics({
          totalAppointments: 0,
          completed: 0,
          cancelled: 0,
          noShow: 0,
          pendingApproval: 0,
          upcoming: 0,
          expired: 0,
          averageRating: null,
          reviewCount: 0,
          byBucket: [],
        }),
      ),
    );
    renderPage();

    expect(await screen.findByText('No ratings yet')).toBeInTheDocument();
    expect(screen.getAllByText('0').length).toBeGreaterThan(0);
  });
});
