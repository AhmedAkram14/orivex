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

export function useCreateBooking() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: CreateBookingRequest) => schedulingApi.createBooking(request),
    // A new booking changes what both the patient's and the treating
    // doctor's dashboards show -- invalidating only bookingsKeys left those
    // widgets stale until an unrelated refetch or a full page reload
    // (Production Readiness Audit -- "fix React Query cache invalidation").
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
