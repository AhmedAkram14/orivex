'use client';

import { useQuery } from '@tanstack/react-query';
import { reportingApi } from '@/features/reporting/api/reporting-api';
import type { DoctorSortBy, ReportFilterParams } from '@/features/reporting/api/types';
import { doctorAnalyticsKeys } from '@/features/reporting/hooks/query-keys';

export function useDoctorAnalytics(
  filter: ReportFilterParams & { sortBy?: DoctorSortBy; limit?: number },
  refetchIntervalMs: number | false = false,
) {
  return useQuery({
    queryKey: doctorAnalyticsKeys.list(filter),
    queryFn: () => reportingApi.getDoctorAnalytics(filter),
    refetchInterval: refetchIntervalMs,
  });
}
