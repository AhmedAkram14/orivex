'use client';

import { useQuery } from '@tanstack/react-query';
import { doctorApi } from '@/features/doctor/api/doctor-api';
import { doctorReportsAnalyticsKeys } from '@/features/doctor/hooks/query-keys';
import type { DoctorReportFilterParams } from '@/features/doctor/api/types';

/**
 * Doctor Reports page rebuild (Phase 3): the real, date-ranged 7-tile +
 * trend + optional previous-period analytics `reports-summary.tsx` renders.
 * `filter` is part of the query key so changing the date range or toggling
 * "compare previous period" refetches instead of showing stale data --
 * mirrors `useDoctorScheduleAppointments`'s own `from`/`to`/`status`-in-key
 * precedent.
 */
export function useDoctorReportsAnalytics(filter: DoctorReportFilterParams) {
  return useQuery({
    queryKey: doctorReportsAnalyticsKeys.list(filter),
    queryFn: () => doctorApi.getReportsAnalytics(filter),
  });
}
