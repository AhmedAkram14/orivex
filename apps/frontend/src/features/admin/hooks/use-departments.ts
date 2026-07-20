'use client';

import { useQuery } from '@tanstack/react-query';
import { adminApi } from '@/features/admin/api/admin-api';
import { adminDepartmentsKeys } from '@/features/admin/hooks/query-keys';

export function useDepartments(hospitalId: string | undefined) {
  return useQuery({
    queryKey: adminDepartmentsKeys.detail(hospitalId ?? 'none'),
    queryFn: () => adminApi.listDepartments(hospitalId as string),
    enabled: Boolean(hospitalId),
  });
}
