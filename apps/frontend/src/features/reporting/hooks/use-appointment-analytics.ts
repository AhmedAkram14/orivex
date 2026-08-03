'use client';

import { useQuery } from '@tanstack/react-query';
import { reportingApi } from '@/features/reporting/api/reporting-api';
import type { ReportFilterParams } from '@/features/reporting/api/types';
import { appointmentAnalyticsKeys } from '@/features/reporting/hooks/query-keys';

export function useAppointmentAnalytics(
  filter: ReportFilterParams & { bucket?: 'day' | 'week' | 'month' | 'year' },
  refetchIntervalMs: number | false = false,
) {
  return useQuery({
    queryKey: appointmentAnalyticsKeys.list(filter),
    queryFn: () => reportingApi.getAppointmentAnalytics(filter),
    refetchInterval: refetchIntervalMs,
  });
}
