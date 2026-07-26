'use client';

import { useQuery } from '@tanstack/react-query';
import { doctorApi } from '@/features/doctor/api/doctor-api';
import type { ListDoctorDirectoryParams } from '@/features/doctor/api/types';
import { doctorDirectoryKeys } from '@/features/doctor/hooks/query-keys';

/** Onboarding Redesign (2026-07-21 proposal, Stage O.5): the Patient Dashboard's Browse/Search Doctors screen. */
export function useDoctorsList(params: ListDoctorDirectoryParams) {
  return useQuery({
    queryKey: doctorDirectoryKeys.list(params),
    queryFn: () => doctorApi.listDoctors(params),
  });
}
