'use client';

import { useQuery } from '@tanstack/react-query';
import { doctorApi } from '@/features/doctor/api/doctor-api';
import { doctorScheduleKeys } from '@/features/doctor/hooks/query-keys';

/**
 * The doctor's real appointments for an arbitrary date range — backs the
 * Schedule page's weekly calendar grid. `from`/`to` are ISO instants;
 * re-fetches automatically as the caller's visible week changes since both
 * are part of the query key. Doctor Reports page rebuild (Phase 2): optional
 * `status` drill-down filter, also part of the query key so switching it
 * refetches rather than showing stale unfiltered data.
 */
export function useDoctorScheduleAppointments(from: string, to: string, status?: string) {
  return useQuery({
    queryKey: doctorScheduleKeys.list({ from, to, status }),
    queryFn: () => doctorApi.getSchedule(from, to, status),
  });
}
