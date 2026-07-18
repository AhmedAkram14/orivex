import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { schedulingApi } from '@/features/scheduling/api/scheduling-api';
import { bookingsKeys } from '@/features/scheduling/hooks/query-keys';
import { doctorDashboardKeys, doctorQueueKeys, doctorUpcomingWorkKeys } from '@/features/doctor/hooks/query-keys';
import {
  patientAppointmentsKeys,
  patientDashboardKeys,
  patientUpcomingAppointmentsKeys,
} from '@/features/patient/hooks/query-keys';

import { useCancelBooking } from './use-cancel-booking';

vi.mock('@/features/scheduling/api/scheduling-api', () => ({
  schedulingApi: { cancelBooking: vi.fn() },
}));

function createWrapper(queryClient: QueryClient) {
  function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  }
  return Wrapper;
}

describe('useCancelBooking', () => {
  it('invalidates every appointment-derived cache on both dashboards after a successful cancellation', async () => {
    vi.mocked(schedulingApi.cancelBooking).mockResolvedValue(undefined);
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useCancelBooking(), { wrapper: createWrapper(queryClient) });
    result.current.mutate('booking-1');

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const invalidatedKeys = invalidateSpy.mock.calls.map((call) => (call[0] as { queryKey?: unknown } | undefined)?.queryKey);
    for (const expectedKey of [
      bookingsKeys.all,
      patientDashboardKeys.all,
      patientUpcomingAppointmentsKeys.all,
      patientAppointmentsKeys.all,
      doctorDashboardKeys.all,
      doctorUpcomingWorkKeys.all,
      doctorQueueKeys.all,
    ]) {
      expect(invalidatedKeys).toContainEqual(expectedKey);
    }
  });
});
