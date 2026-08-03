'use client';

import { useQuery } from '@tanstack/react-query';
import { reportingApi } from '@/features/reporting/api/reporting-api';
import type { ReportFilterParams } from '@/features/reporting/api/types';
import { paymentAnalyticsKeys } from '@/features/reporting/hooks/query-keys';

export function usePaymentAnalytics(filter: ReportFilterParams, refetchIntervalMs: number | false = false) {
  return useQuery({
    queryKey: paymentAnalyticsKeys.list(filter),
    queryFn: () => reportingApi.getPaymentAnalytics(filter),
    refetchInterval: refetchIntervalMs,
  });
}
