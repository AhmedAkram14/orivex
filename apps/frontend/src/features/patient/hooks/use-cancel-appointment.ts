'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { patientApi } from '@/features/patient/api/patient-api';
import {
  patientAppointmentsKeys,
  patientDashboardKeys,
  patientUpcomingAppointmentsKeys,
} from '@/features/patient/hooks/query-keys';
import { doctorDashboardKeys, doctorQueueKeys, doctorUpcomingWorkKeys } from '@/features/doctor/hooks/query-keys';
import { availabilityWindowsKeys } from '@/features/scheduling/hooks/query-keys';

export interface CancelAppointmentInput {
  appointmentId: string;
}

/**
 * Demo Readiness P0: the real production cancel mutation
 * (`PATCH /appointments/:id`, `action: 'cancel'`) -- mirrors
 * `useRescheduleAppointment`'s exact invalidation set, since a successful
 * cancellation changes the same surfaces a reschedule does (the appointment
 * moves to Cancelled/History, its slot is released back to availability, and
 * -- for a Paid appointment that was already Confirmed/paid -- a real
 * automatic refund fires entirely server-side, no separate mutation needed
 * here). Also invalidated on error: a 404/422 means the cached appointment
 * list was already stale the moment the request was made (e.g. the
 * appointment was already cancelled/completed elsewhere, in another tab).
 */
export function useCancelAppointment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ appointmentId }: CancelAppointmentInput) => patientApi.cancelAppointment(appointmentId),
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
      queryClient.invalidateQueries({ queryKey: patientAppointmentsKeys.all });
    },
  });
}
