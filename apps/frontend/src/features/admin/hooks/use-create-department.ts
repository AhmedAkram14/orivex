'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '@/features/admin/api/admin-api';
import { adminDepartmentsKeys } from '@/features/admin/hooks/query-keys';
import type { CreateDepartmentRequest } from '@/features/admin/api/types';

export function useCreateDepartment(hospitalId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: CreateDepartmentRequest) => adminApi.createDepartment(hospitalId, request),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminDepartmentsKeys.detail(hospitalId) });
    },
  });
}
