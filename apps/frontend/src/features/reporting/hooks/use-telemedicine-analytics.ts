'use client';

import { useQuery } from '@tanstack/react-query';
import { reportingApi } from '@/features/reporting/api/reporting-api';
import type { ReportFilterParams } from '@/features/reporting/api/types';
import { telemedicineAnalyticsKeys } from '@/features/reporting/hooks/query-keys';

export function useTelemedicineAnalytics(filter: ReportFilterParams, refetchIntervalMs: number | false = false) {
  return useQuery({
    queryKey: telemedicineAnalyticsKeys.list(filter),
    queryFn: () => reportingApi.getTelemedicineAnalytics(filter),
    refetchInterval: refetchIntervalMs,
  });
}
