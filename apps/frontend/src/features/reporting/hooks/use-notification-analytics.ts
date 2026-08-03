'use client';

import { useQuery } from '@tanstack/react-query';
import { reportingApi } from '@/features/reporting/api/reporting-api';
import type { ReportFilterParams } from '@/features/reporting/api/types';
import { notificationAnalyticsKeys } from '@/features/reporting/hooks/query-keys';

export function useNotificationAnalytics(filter: ReportFilterParams, refetchIntervalMs: number | false = false) {
  return useQuery({
    queryKey: notificationAnalyticsKeys.list(filter),
    queryFn: () => reportingApi.getNotificationAnalytics(filter),
    refetchInterval: refetchIntervalMs,
  });
}
