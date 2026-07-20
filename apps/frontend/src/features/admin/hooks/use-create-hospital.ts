'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '@/features/admin/api/admin-api';
import { adminHospitalsKeys, platformKpisKeys } from '@/features/admin/hooks/query-keys';
import type { CreateHospitalRequest } from '@/features/admin/api/types';

export function useCreateHospital() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: CreateHospitalRequest) => adminApi.createHospital(request),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminHospitalsKeys.all });
      queryClient.invalidateQueries({ queryKey: platformKpisKeys.all });
    },
  });
}
