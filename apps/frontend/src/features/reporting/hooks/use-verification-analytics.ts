'use client';

import { useQuery } from '@tanstack/react-query';
import { reportingApi } from '@/features/reporting/api/reporting-api';
import type { ReportFilterParams } from '@/features/reporting/api/types';
import { verificationAnalyticsKeys } from '@/features/reporting/hooks/query-keys';

export function useVerificationAnalytics(filter: ReportFilterParams, refetchIntervalMs: number | false = false) {
  return useQuery({
    queryKey: verificationAnalyticsKeys.list(filter),
    queryFn: () => reportingApi.getVerificationAnalytics(filter),
    refetchInterval: refetchIntervalMs,
  });
}
