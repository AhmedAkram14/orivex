'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { consultationApi } from '@/features/consultation/api/consultation-api';
import { consultationSummaryKeys, doctorReviewsKeys } from '@/features/consultation/hooks/query-keys';

/** Product follow-up (2026-07-29): lets a patient retract an already-submitted review. */
export function useDeleteConsultationFeedback(consultationSessionId: string, doctorProfileId?: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => consultationApi.deleteFeedback(consultationSessionId),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: consultationSummaryKeys.detail(consultationSessionId) }),
        doctorProfileId
          ? queryClient.invalidateQueries({ queryKey: doctorReviewsKeys.detail(doctorProfileId) })
          : Promise.resolve(),
      ]);
    },
  });
}
