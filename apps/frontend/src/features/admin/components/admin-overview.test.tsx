import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { AdminOverview } from '@/features/admin/api/types';
import { useAdminOverview } from '@/features/admin/hooks/use-admin-overview';
import enMessages from '../../../../messages/en.json';

import { AdminOverviewPanels } from './admin-overview';

vi.mock('@/features/admin/hooks/use-admin-overview', () => ({
  useAdminOverview: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn(), back: vi.fn(), forward: vi.fn() }),
  usePathname: () => '/admin',
  useParams: () => ({ locale: 'en' }),
  useSearchParams: () => new URLSearchParams(),
  redirect: vi.fn(),
  permanentRedirect: vi.fn(),
  RedirectType: { push: 'push', replace: 'replace' },
}));

const NOW = new Date('2026-10-18T12:00:00.000Z');
const hoursAgo = (hours: number) => new Date(NOW.getTime() - hours * 3_600_000).toISOString();
const empty = { count: 0, oldestWaitingSince: null };

function overview(overrides: { needsAttention?: Partial<AdminOverview['needsAttention']>; health?: Partial<AdminOverview['health']> } = {}): AdminOverview {
  return {
    generatedAt: NOW.toISOString(),
    needsAttention: { pendingVerifications: empty, openDisputes: empty, flaggedReviews: empty, ...overrides.needsAttention },
    averageVerificationReviewHours: 31.4,
    health: {
      appointmentsToday: 6,
      appointmentsLast7Days: 31,
      completionRate: 0.713,
      cancellationRate: 0.054,
      noShowRate: 0.027,
      revenueToday: 1200,
      revenueChangePercent: 20,
      failedPayments: 0,
      activeDoctors: 9,
      activePatients: 13,
      activeWindowDays: 30,
      ...overrides.health,
    },
  };
}

function mockQuery(state: { data?: AdminOverview; isLoading?: boolean; isError?: boolean }, refetch = vi.fn()) {
  vi.mocked(useAdminOverview).mockReturnValue({
    data: state.data,
    isLoading: state.isLoading ?? false,
    isError: state.isError ?? false,
    isRefetching: false,
    refetch,
  } as never);
  return refetch;
}

function renderPanels() {
  return render(
    <NextIntlClientProvider locale="en" messages={enMessages} timeZone="Africa/Cairo">
      <AdminOverviewPanels />
    </NextIntlClientProvider>,
  );
}

describe('AdminOverviewPanels', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(NOW);
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('shows one band heading per band and skeletons, never the empty state, while loading', () => {
    mockQuery({ isLoading: true });
    renderPanels();

    expect(screen.getByRole('heading', { level: 2, name: 'Needs attention' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: 'Platform health' })).toBeInTheDocument();
    expect(screen.queryByText('Nothing needs attention')).not.toBeInTheDocument();
  });

  it('says "Nothing needs attention" only when the overview loaded and every queue is empty', () => {
    mockQuery({ data: overview() });
    renderPanels();

    expect(screen.getByText('Nothing needs attention')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('shows an error -- not the empty state -- when the overview fails, with a retry and direct queue links', async () => {
    const refetch = mockQuery({ isError: true });
    renderPanels();

    const alert = screen.getByRole('alert');
    expect(within(alert).getByText("We couldn't load the overview")).toBeInTheDocument();
    expect(within(alert).getByText(/This isn't an all-clear/)).toBeInTheDocument();
    expect(screen.queryByText('Nothing needs attention')).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Platform health' })).not.toBeInTheDocument();

    expect(screen.getByRole('link', { name: 'Pending verifications' })).toHaveAttribute('href', '/en/admin/verification-queue');
    expect(screen.getByRole('link', { name: 'Open disputes' })).toHaveAttribute('href', '/en/admin/disputes');
    expect(screen.getByRole('link', { name: 'Flagged reviews' })).toHaveAttribute('href', '/en/admin/reviews');

    vi.useRealTimers();
    await userEvent.click(within(alert).getByRole('button', { name: 'Try again' }));
    expect(refetch).toHaveBeenCalled();
  });

  it('lists only non-empty queues, longest-waiting first, and flags the late one', () => {
    mockQuery({
      data: overview({
        needsAttention: {
          pendingVerifications: { count: 3, oldestWaitingSince: hoursAgo(5) },
          openDisputes: { count: 2, oldestWaitingSince: hoursAgo(80) },
        },
      }),
    });
    renderPanels();

    const cards = within(screen.getByRole('list')).getAllByRole('link');
    expect(cards.map((card) => card.getAttribute('href'))).toEqual(['/en/admin/disputes', '/en/admin/verification-queue']);

    expect(within(cards[0]!).getByText('Overdue')).toBeInTheDocument();
    expect(within(cards[0]!).getByText('Oldest waiting 3 days')).toBeInTheDocument();
    expect(within(cards[1]!).queryByText('Overdue')).not.toBeInTheDocument();
    expect(within(cards[1]!).getByText('Oldest waiting 5 hours')).toBeInTheDocument();
    expect(within(cards[1]!).getByText('Average review time: 31 hours')).toBeInTheDocument();
    expect(screen.queryByText('Flagged reviews')).not.toBeInTheDocument();
    expect(screen.queryByText('Nothing needs attention')).not.toBeInTheDocument();
  });

  it('says plainly when a queue records no waiting time', () => {
    mockQuery({ data: overview({ needsAttention: { flaggedReviews: { count: 4, oldestWaitingSince: null } } }) });
    renderPanels();

    const card = screen.getByRole('link', { name: /Flagged reviews/ });
    expect(within(card).getByText('Waiting time not recorded')).toBeInTheDocument();
  });

  it('labels each health figure with its period and links it into Analytics', () => {
    mockQuery({ data: overview() });
    renderPanels();

    expect(screen.getByText('31 in the last 7 days')).toBeInTheDocument();
    expect(screen.getByText('71.3%')).toBeInTheDocument();
    expect(screen.getByText('Cancelled 5.4% · No-show 2.7% · all time')).toBeInTheDocument();
    expect(screen.getAllByText('Completed a visit in the last 30 days')).toHaveLength(2);
    expect(screen.getByText('vs. this time last week')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Completion rate/ })).toHaveAttribute('href', '/en/admin/analytics#appointments');
    expect(screen.getByRole('link', { name: /Active patients/ })).toHaveAttribute('href', '/en/admin/analytics#kpis');
    expect(screen.getByRole('link', { name: 'View audit log' })).toHaveAttribute('href', '/en/admin/audit-log');
  });

  it('shows failed payments only when there are some', () => {
    mockQuery({ data: overview() });
    const { unmount } = renderPanels();
    expect(screen.queryByText('Failed payments')).not.toBeInTheDocument();
    unmount();

    mockQuery({ data: overview({ health: { failedPayments: 2 } }) });
    renderPanels();
    expect(screen.getByRole('link', { name: /Failed payments/ })).toHaveAttribute('href', '/en/admin/payments');
  });
});
