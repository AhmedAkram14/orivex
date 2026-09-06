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
      startJourney,
    }: {
      freeTextDescription: string;
      certaintyLevel?: 'suspected' | 'confirmed' | 'ruled_out';
      // Health Journey stage-advance fix (ORIVEX Remaining Work Audit, P0
      // C5): the real backend only ever creates a HealthJourney when this
      // is explicitly true -- before this fix, no caller anywhere in this
      // codebase ever passed it, so no journey was ever created at all.
      startJourney?: boolean;
    }) => consultationApi.recordDiagnosis(consultationSessionId, freeTextDescription, certaintyLevel, startJourney),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: consultationSummaryKeys.detail(consultationSessionId) });
    },
  });
}
