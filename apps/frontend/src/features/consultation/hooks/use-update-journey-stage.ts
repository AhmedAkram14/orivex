'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { consultationApi } from '@/features/consultation/api/consultation-api';
import type { JourneyStage } from '@/features/consultation/api/types';
import { consultationSummaryKeys } from '@/features/consultation/hooks/query-keys';

/**
 * Health Journey stage-advance fix (ORIVEX Remaining Work Audit, P0 C5):
 * the write side of the Journey tab -- only invalidates this session's own
 * summary (the journey list rendered there), since no other screen in this
 * codebase reads Health Journeys yet.
 */
export function useUpdateJourneyStage(consultationSessionId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ journeyId, stage }: { journeyId: string; stage: JourneyStage }) =>
      consultationApi.updateJourneyStage(journeyId, stage),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: consultationSummaryKeys.detail(consultationSessionId) });
    },
  });
}
