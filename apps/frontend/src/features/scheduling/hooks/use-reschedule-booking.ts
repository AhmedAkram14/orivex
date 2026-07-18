'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { schedulingApi } from '@/features/scheduling/api/scheduling-api';
import { bookingsKeys } from '@/features/scheduling/hooks/query-keys';
import { doctorDashboardKeys, doctorQueueKeys, doctorUpcomingWorkKeys } from '@/features/doctor/hooks/query-keys';
import {
  patientAppointmentsKeys,
  patientDashboardKeys,
  patientUpcomingAppointmentsKeys,
} from '@/features/patient/hooks/query-keys';
import type { CreateBookingRequest } from '@/features/scheduling/types';

export function useRescheduleBooking() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, request }: { id: string; request: CreateBookingRequest }) =>
      schedulingApi.rescheduleBooking(id, request),
    // Same cross-dashboard invalidation as useCreateBooking -- a
    // reschedule changes the scheduled time both dashboards display.
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: bookingsKeys.all });
      queryClient.invalidateQueries({ queryKey: patientDashboardKeys.all });
      queryClient.invalidateQueries({ queryKey: patientUpcomingAppointmentsKeys.all });
      queryClient.invalidateQueries({ queryKey: patientAppointmentsKeys.all });
      queryClient.invalidateQueries({ queryKey: doctorDashboardKeys.all });
      queryClient.invalidateQueries({ queryKey: doctorUpcomingWorkKeys.all });
      queryClient.invalidateQueries({ queryKey: doctorQueueKeys.all });
    },
  });
}
