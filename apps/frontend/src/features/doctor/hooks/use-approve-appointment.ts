'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { doctorApi } from '@/features/doctor/api/doctor-api';
import { doctorDashboardKeys, doctorPendingApprovalKeys, doctorQueueKeys } from '@/features/doctor/hooks/query-keys';

export function useApproveAppointment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (appointmentId: string) => doctorApi.approveAppointment(appointmentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: doctorPendingApprovalKeys.all });
      queryClient.invalidateQueries({ queryKey: doctorQueueKeys.all });
      queryClient.invalidateQueries({ queryKey: doctorDashboardKeys.all });
    },
  });
}
