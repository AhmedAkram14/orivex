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

/**
 * Onboarding Redesign integration-gap closure (2026-07-25): the real
 * production booking mutation (`POST /appointments`), replacing the old
 * MSW-only `useCreateBooking`/`schedulingApi.createBooking`. A successful
 * booking changes what both the patient's and the treating doctor's
 * dashboards show, same invalidation set `useCreateBooking` used to cover.
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
    },
  });
}
