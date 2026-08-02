'use client';

import { useQuery } from '@tanstack/react-query';
import { doctorApi } from '@/features/doctor/api/doctor-api';
import { doctorReportsSummaryKeys } from '@/features/doctor/hooks/query-keys';

export function useDoctorReportsSummary() {
  return useQuery({
    queryKey: doctorReportsSummaryKeys.detail('current'),
    queryFn: () => doctorApi.getReportsSummary(),
  });
}
