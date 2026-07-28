'use client';

import { useQuery } from '@tanstack/react-query';
import { doctorApi } from '@/features/doctor/api/doctor-api';
import { doctorPendingApprovalKeys } from '@/features/doctor/hooks/query-keys';

export function usePendingApprovalAppointments() {
  return useQuery({
    queryKey: doctorPendingApprovalKeys.list(),
    queryFn: () => doctorApi.getPendingApproval(),
  });
}
