'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { patientApi } from '@/features/patient/api/patient-api';
import type { BookAppointmentRequest } from '@/features/patient/api/types';
import {
  patientAppointmentsKeys,
  patientDashboardKeys,
  patientUpcomingAppointmentsKeys,
} from '@/features/patient/hooks/query-keys';
import { doctorDashboardKeys, doctorQueueKeys, doctorUpcomingWorkKeys } from '@/features/doctor/hooks/query-keys';
import { availabilityWindowsKeys } from '@/features/scheduling/hooks/query-keys';

/**
 * Onboarding Redesign integration-gap closure (2026-07-25): the real
 * production booking mutation (`POST /appointments`), replacing the old
 * MSW-only `useCreateBooking`/`schedulingApi.createBooking`. A successful
 * booking changes what both the patient's and the treating doctor's
 * dashboards show, same invalidation set `useCreateBooking` used to cover.
 *
 * `availabilityWindowsKeys` is invalidated on both success AND error --
 * never trust a cached slot grid after attempting a booking against it: a
 * successful booking removes the slot from availability, and a failed one
 * (e.g. someone else booked it first, a 409 conflict) means the cached list
 * was already stale the moment the request was made. Either way the next
 * render must refetch, not keep showing a slot that may no longer be real.
 */
export function useBookAppointment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: BookAppointmentRequest) => patientApi.bookAppointment(request),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: patientDashboardKeys.all });
      queryClient.invalidateQueries({ queryKey: patientUpcomingAppointmentsKeys.all });
      queryClient.invalidateQueries({ queryKey: patientAppointmentsKeys.all });
      queryClient.invalidateQueries({ queryKey: doctorDashboardKeys.all });
      queryClient.invalidateQueries({ queryKey: doctorUpcomingWorkKeys.all });
      queryClient.invalidateQueries({ queryKey: doctorQueueKeys.all });
      queryClient.invalidateQueries({ queryKey: availabilityWindowsKeys.all });
    },
    onError: () => {
      queryClient.invalidateQueries({ queryKey: availabilityWindowsKeys.all });
    },
  });
}
