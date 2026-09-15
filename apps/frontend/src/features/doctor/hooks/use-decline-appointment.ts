'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { doctorApi } from '@/features/doctor/api/doctor-api';
import {
  doctorDashboardKeys,
  doctorPatientChartAppointmentsKeys,
  doctorPendingApprovalKeys,
  doctorQueueKeys,
} from '@/features/doctor/hooks/query-keys';

/**
 * Doctor Patient Chart Phase 2: mirrors useApproveAppointment's exact shape
 * and invalidations -- a decline moves an appointment out of Pending
 * Approval the same way an approve does, it just lands on Cancelled instead
 * of Confirmed, so it never enters the Queue/Dashboard, but invalidating
 * those two anyway costs nothing and keeps this hook a true mirror.
 */
export function useDeclineAppointment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ appointmentId, reason }: { appointmentId: string; reason?: string }) =>
      doctorApi.declineAppointment(appointmentId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: doctorPendingApprovalKeys.all });
      queryClient.invalidateQueries({ queryKey: doctorQueueKeys.all });
      queryClient.invalidateQueries({ queryKey: doctorDashboardKeys.all });
      queryClient.invalidateQueries({ queryKey: doctorPatientChartAppointmentsKeys.all });
    },
  });
}
