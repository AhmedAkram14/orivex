'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { patientApi } from '@/features/patient/api/patient-api';
import { healthPassportEntriesKeys } from '@/features/patient/hooks/query-keys';

/** I6 -- Health Passport. */
export function useDeleteHealthPassportEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => patientApi.deleteHealthPassportEntry(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: healthPassportEntriesKeys.detail('current') });
    },
  });
}
