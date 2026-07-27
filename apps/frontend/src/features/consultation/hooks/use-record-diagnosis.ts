'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { consultationApi } from '@/features/consultation/api/consultation-api';
import { consultationSummaryKeys } from '@/features/consultation/hooks/query-keys';

export function useRecordDiagnosis(consultationSessionId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      freeTextDescription,
      certaintyLevel,
    }: {
      freeTextDescription: string;
      certaintyLevel?: 'suspected' | 'confirmed' | 'ruled_out';
    }) => consultationApi.recordDiagnosis(consultationSessionId, freeTextDescription, certaintyLevel),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: consultationSummaryKeys.detail(consultationSessionId) });
    },
  });
}
