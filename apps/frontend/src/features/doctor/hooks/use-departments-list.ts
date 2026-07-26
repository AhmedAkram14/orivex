'use client';

import { useQuery } from '@tanstack/react-query';
import { doctorApi } from '@/features/doctor/api/doctor-api';
import { doctorDepartmentsKeys } from '@/features/doctor/hooks/query-keys';

/** Onboarding Redesign (2026-07-21 proposal, Stage O.6): the Professional Info step's Department dropdown, enabled only once a Hospital is chosen. */
export function useDepartmentsList(hospitalId: string | undefined) {
  return useQuery({
    queryKey: doctorDepartmentsKeys.list(hospitalId),
    queryFn: () => doctorApi.listDepartments(hospitalId as string),
    enabled: Boolean(hospitalId),
  });
}
