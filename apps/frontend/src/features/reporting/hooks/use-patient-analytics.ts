'use client';

import { useQuery } from '@tanstack/react-query';
import { reportingApi } from '@/features/reporting/api/reporting-api';
import type { ReportFilterParams } from '@/features/reporting/api/types';
import { patientAnalyticsKeys } from '@/features/reporting/hooks/query-keys';

export function usePatientAnalytics(filter: ReportFilterParams, refetchIntervalMs: number | false = false) {
  return useQuery({
    queryKey: patientAnalyticsKeys.list(filter),
    queryFn: () => reportingApi.getPatientAnalytics(filter),
    refetchInterval: refetchIntervalMs,
  });
}
