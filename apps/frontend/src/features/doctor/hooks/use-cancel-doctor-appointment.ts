'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { patientApi } from '@/features/patient/api/patient-api';
import {
  doctorDashboardKeys,
  doctorPatientChartAppointmentsKeys,
  doctorPatientsKeys,
  doctorQueueKeys,
  doctorScheduleKeys,
  doctorUpcomingWorkKeys,
} from '@/features/doctor/hooks/query-keys';
import { availabilityWindowsKeys } from '@/features/scheduling/hooks/query-keys';

export interface CancelDoctorAppointmentInput {
  appointmentId: string;
}

/**
 * Phase 2 (Appointment Visibility & Consultation History): the doctor-side
 * wrapper for the one real doctor-facing transition on a stuck past
 * `Confirmed`/`Requested` appointment -- see IMPLEMENTATION_NOTES.md's Phase
 * 0 finding (b): `complete()`/`markNoShow()` are system-only, `cancel` is the
 * only real option. Reuses `patientApi.cancelAppointment` as-is (`PATCH
 * /appointments/:id`, `{ action: 'cancel' }`) -- `AppointmentController`
 * ownership-checks the caller for either role in-handler, so no new backend
 * route is needed, only a doctor-scoped cache-invalidation set (mirrors
 * `useCancelAppointment`'s patient-side invalidation, swapped for the
 * doctor-visible surfaces this action can change: the Appointments page's
 * own schedule query, Queue, Dashboard, Patients list, and this patient's
 * chart).
 */
export function useCancelDoctorAppointment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ appointmentId }: CancelDoctorAppointmentInput) => patientApi.cancelAppointment(appointmentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: doctorScheduleKeys.all });
      queryClient.invalidateQueries({ queryKey: doctorQueueKeys.all });
      queryClient.invalidateQueries({ queryKey: doctorDashboardKeys.all });
      queryClient.invalidateQueries({ queryKey: doctorUpcomingWorkKeys.all });
      queryClient.invalidateQueries({ queryKey: doctorPatientsKeys.all });
      queryClient.invalidateQueries({ queryKey: doctorPatientChartAppointmentsKeys.all });
      queryClient.invalidateQueries({ queryKey: availabilityWindowsKeys.all });
    },
    onError: () => {
      queryClient.invalidateQueries({ queryKey: doctorScheduleKeys.all });
      queryClient.invalidateQueries({ queryKey: doctorPatientChartAppointmentsKeys.all });
    },
  });
}
