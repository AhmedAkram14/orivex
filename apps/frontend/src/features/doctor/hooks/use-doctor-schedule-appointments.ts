'use client';

import { useQuery } from '@tanstack/react-query';
import { doctorApi } from '@/features/doctor/api/doctor-api';
import { doctorScheduleKeys } from '@/features/doctor/hooks/query-keys';

/**
 * The doctor's real appointments for an arbitrary date range — backs the
 * Schedule page's weekly calendar grid. `from`/`to` are ISO instants;
 * re-fetches automatically as the caller's visible week changes since both
 * are part of the query key.
 */
export function useDoctorScheduleAppointments(from: string, to: string) {
  return useQuery({
    queryKey: doctorScheduleKeys.list({ from, to }),
    queryFn: () => doctorApi.getSchedule(from, to),
  });
}
