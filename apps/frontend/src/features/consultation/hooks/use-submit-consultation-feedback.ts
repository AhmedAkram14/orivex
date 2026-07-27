'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { consultationApi } from '@/features/consultation/api/consultation-api';
import { consultationSummaryKeys, doctorReviewsKeys } from '@/features/consultation/hooks/query-keys';

/**
 * §8/§11 of the consultation-completion follow-up: "Rate your consultation."
 * Invalidates the consultation summary (so the submitted review appears
 * immediately, preventing a duplicate-submission attempt) and the doctor's
 * reviews/rating query (so the aggregate updates if the patient is viewing
 * that doctor's profile in the same session).
 */
export function useSubmitConsultationFeedback(consultationSessionId: string, doctorProfileId?: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ rating, comment }: { rating: number; comment?: string }) =>
      consultationApi.submitFeedback(consultationSessionId, rating, comment),
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
