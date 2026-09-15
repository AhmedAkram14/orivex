import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { doctorApi } from '@/features/doctor/api/doctor-api';
import {
  doctorDashboardKeys,
  doctorPatientChartAppointmentsKeys,
  doctorPendingApprovalKeys,
  doctorQueueKeys,
} from '@/features/doctor/hooks/query-keys';
import type { DeclinedAppointment } from '@/features/doctor/api/types';

import { useDeclineAppointment } from './use-decline-appointment';

vi.mock('@/features/doctor/api/doctor-api', () => ({
  doctorApi: { declineAppointment: vi.fn() },
}));

function createWrapper(queryClient: QueryClient) {
  function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  }
  return Wrapper;
}

describe('useDeclineAppointment', () => {
  it('calls declineAppointment with the reason and invalidates pending-approval/queue/dashboard/patient-chart caches', async () => {
    vi.mocked(doctorApi.declineAppointment).mockResolvedValue({ id: 'appointment-1', status: 'cancelled' } as DeclinedAppointment);
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useDeclineAppointment(), { wrapper: createWrapper(queryClient) });
    result.current.mutate({ appointmentId: 'appointment-1', reason: 'Fully booked that week' });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(doctorApi.declineAppointment).toHaveBeenCalledWith('appointment-1', 'Fully booked that week');

    const invalidatedKeys = invalidateSpy.mock.calls.map((call) => (call[0] as { queryKey?: unknown } | undefined)?.queryKey);
    expect(invalidatedKeys).toContainEqual(doctorPendingApprovalKeys.all);
    expect(invalidatedKeys).toContainEqual(doctorQueueKeys.all);
    expect(invalidatedKeys).toContainEqual(doctorDashboardKeys.all);
    // Phase 2.1's fix, mirrored onto decline too: without this, declining
    // from the Queue would leave a stale "Requested" row on the patient
    // chart page if it was already cached.
    expect(invalidatedKeys).toContainEqual(doctorPatientChartAppointmentsKeys.all);
  });

  it('works without a reason -- it is optional', async () => {
    vi.mocked(doctorApi.declineAppointment).mockResolvedValue({ id: 'appointment-2', status: 'cancelled' } as DeclinedAppointment);
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    const { result } = renderHook(() => useDeclineAppointment(), { wrapper: createWrapper(queryClient) });
    result.current.mutate({ appointmentId: 'appointment-2' });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(doctorApi.declineAppointment).toHaveBeenCalledWith('appointment-2', undefined);
  });
});
