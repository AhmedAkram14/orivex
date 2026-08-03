'use client';

import { useQuery } from '@tanstack/react-query';
import { reportingApi } from '@/features/reporting/api/reporting-api';
import type { ReportFilterParams } from '@/features/reporting/api/types';
import { dashboardKpisKeys } from '@/features/reporting/hooks/query-keys';

export function useDashboardKpis(filter: ReportFilterParams, refetchIntervalMs: number | false = false) {
  return useQuery({
    queryKey: dashboardKpisKeys.list(filter),
    queryFn: () => reportingApi.getKpis(filter),
    refetchInterval: refetchIntervalMs,
  });
}
