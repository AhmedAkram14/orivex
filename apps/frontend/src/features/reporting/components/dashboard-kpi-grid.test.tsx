import { render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { describe, expect, it, vi } from 'vitest';

import { useDashboardKpis } from '@/features/reporting/hooks/use-dashboard-kpis';
import enMessages from '../../../../messages/en.json';

import { DashboardKpiGrid } from './dashboard-kpi-grid';

vi.mock('@/features/reporting/hooks/use-dashboard-kpis', () => ({
  useDashboardKpis: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn(), back: vi.fn(), forward: vi.fn() }),
  usePathname: () => '/admin/analytics',
  useParams: () => ({ locale: 'en' }),
  useSearchParams: () => new URLSearchParams(),
  redirect: vi.fn(),
  permanentRedirect: vi.fn(),
  RedirectType: { push: 'push', replace: 'replace' },
}));

function renderGrid() {
  return render(
    <NextIntlClientProvider locale="en" messages={enMessages} timeZone="Africa/Cairo">
      <DashboardKpiGrid filter={{}} refetchIntervalMs={false} />
    </NextIntlClientProvider>,
  );
}

describe('DashboardKpiGrid', () => {
  it('shows a danger alert when the KPI query errors', () => {
    vi.mocked(useDashboardKpis).mockReturnValue({ data: undefined, isLoading: false, isError: true } as never);

    renderGrid();

    expect(screen.getByText('Could not load dashboard KPIs.')).toBeInTheDocument();
  });

  it('renders real KPI values, honestly showing "Not available" for a null average rating', () => {
    vi.mocked(useDashboardKpis).mockReturnValue({
      data: {
        totalDoctors: 5,
        activeDoctors: 3,
        verifiedDoctors: 4,
        pendingVerification: 1,
        totalPatients: 20,
        activePatients: 12,
        totalAppointments: 30,
        completedAppointments: 20,
        cancelledAppointments: 5,
        upcomingAppointments: 5,
        videoConsultations: 15,
        payments: 18,
        revenue: 4500,
        averageConsultationDurationMinutes: null,
        averageRating: null,
      },
      isLoading: false,
      isError: false,
    } as never);

    renderGrid();

    expect(screen.getByText('Total doctors').nextElementSibling).toHaveTextContent('5');
    expect(screen.getAllByText('Not available').length).toBe(2);
  });

  it('shows active doctors beside active patients, both with the completed-visit definition', () => {
    vi.mocked(useDashboardKpis).mockReturnValue({
      data: {
        totalDoctors: 5,
        activeDoctors: 3,
        verifiedDoctors: 4,
        pendingVerification: 1,
        totalPatients: 20,
        activePatients: 12,
        totalAppointments: 30,
        completedAppointments: 20,
        cancelledAppointments: 5,
        upcomingAppointments: 5,
        videoConsultations: 15,
        payments: 18,
        revenue: 4500,
        averageConsultationDurationMinutes: null,
        averageRating: null,
      },
      isLoading: false,
      isError: false,
    } as never);

    renderGrid();

    expect(screen.getByText('Active doctors').nextElementSibling).toHaveTextContent('3');
    expect(screen.getByText('Active patients').nextElementSibling).toHaveTextContent('12');
    expect(screen.getAllByText('Completed a visit in the last 30 days')).toHaveLength(2);
  });
});
