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

export function useCancelBooking() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => schedulingApi.cancelBooking(id),
    // Same cross-dashboard invalidation as useCreateBooking -- a
    // cancellation is just as visible on both dashboards as a new booking.
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
