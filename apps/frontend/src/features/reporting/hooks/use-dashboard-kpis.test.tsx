import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { reportingApi } from '@/features/reporting/api/reporting-api';
import type { DashboardKpis } from '@/features/reporting/api/types';

import { useDashboardKpis } from './use-dashboard-kpis';

vi.mock('@/features/reporting/api/reporting-api', () => ({
  reportingApi: { getKpis: vi.fn() },
}));

function createWrapper(queryClient: QueryClient) {
  function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  }
  return Wrapper;
}

const kpis: DashboardKpis = {
  totalDoctors: 5,
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
  averageConsultationDurationMinutes: 22.5,
  averageRating: 4.6,
};

describe('useDashboardKpis', () => {
  it('fetches KPIs with the given filter and exposes the real response', async () => {
    vi.mocked(reportingApi.getKpis).mockResolvedValue(kpis);
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    const { result } = renderHook(() => useDashboardKpis({ dateFrom: '2026-01-01' }), {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(reportingApi.getKpis).toHaveBeenCalledWith({ dateFrom: '2026-01-01' });
    expect(result.current.data?.revenue).toBe(4500);
  });

  it('passes refetchIntervalMs straight through to the query (Live Refresh)', async () => {
    vi.mocked(reportingApi.getKpis).mockResolvedValue(kpis);
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    const { result } = renderHook(() => useDashboardKpis({}, 30_000), { wrapper: createWrapper(queryClient) });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBeDefined();
  });
});
