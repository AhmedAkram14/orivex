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
import type { Booking, CreateBookingRequest } from '@/features/scheduling/types';

import { useRescheduleBooking } from './use-reschedule-booking';

vi.mock('@/features/scheduling/api/scheduling-api', () => ({
  schedulingApi: { rescheduleBooking: vi.fn() },
}));

const REQUEST: CreateBookingRequest = {
  slotStart: '2026-08-01T10:00:00.000Z',
  slotEnd: '2026-08-01T10:30:00.000Z',
};

function createWrapper(queryClient: QueryClient) {
  function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  }
  return Wrapper;
}

describe('useRescheduleBooking', () => {
  it('invalidates every appointment-derived cache on both dashboards after a successful reschedule', async () => {
    vi.mocked(schedulingApi.rescheduleBooking).mockResolvedValue({
      id: 'booking-1',
      slotStart: REQUEST.slotStart,
      slotEnd: REQUEST.slotEnd,
      status: 'confirmed',
    } as Booking);
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useRescheduleBooking(), { wrapper: createWrapper(queryClient) });
    result.current.mutate({ id: 'booking-1', request: REQUEST });

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
