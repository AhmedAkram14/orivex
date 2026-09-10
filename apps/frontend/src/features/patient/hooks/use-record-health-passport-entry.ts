'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { patientApi } from '@/features/patient/api/patient-api';
import type { RecordHealthPassportEntryInput } from '@/features/patient/api/types';
import { healthPassportEntriesKeys } from '@/features/patient/hooks/query-keys';

/** I6 -- Health Passport. */
export function useRecordHealthPassportEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: RecordHealthPassportEntryInput) => patientApi.recordHealthPassportEntry(input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: healthPassportEntriesKeys.detail('current') });
    },
  });
}
