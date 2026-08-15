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

export interface RescheduleAppointmentInput {
  appointmentId: string;
  newAvailabilityWindowId: string;
}

/**
 * Patient-Facing Reschedule (Phase 3 Step 2): the real production reschedule
 * mutation (`PATCH /appointments/:id`, `action: 'reschedule'`) -- mirrors
 * `useBookAppointment`'s exact invalidation set, since a successful
 * reschedule changes the same surfaces a booking does (the old appointment
 * moves to Rescheduled/History, a new one appears in Upcoming, and the
 * consumed slot disappears from availability). Also invalidated on error:
 * a 409 (someone else took the slot) or 404/422 (the appointment was already
 * changed elsewhere) both mean the cached appointment list and slot grid
 * were already stale the moment the request was made.
 */
export function useRescheduleAppointment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ appointmentId, newAvailabilityWindowId }: RescheduleAppointmentInput) =>
      patientApi.rescheduleAppointment(appointmentId, newAvailabilityWindowId),
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
