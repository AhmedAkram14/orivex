'use client';

import { useQuery } from '@tanstack/react-query';
import { adminApi } from '@/features/admin/api/admin-api';
import { adminHospitalsKeys } from '@/features/admin/hooks/query-keys';

export function useHospitals() {
  return useQuery({
    queryKey: adminHospitalsKeys.lists(),
    queryFn: () => adminApi.listHospitals(),
  });
}
