'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { consultationApi } from '@/features/consultation/api/consultation-api';
import { doctorReviewsKeys } from '@/features/consultation/hooks/query-keys';

/** I11 -- Admin content moderation: flags a review about the caller (a doctor), removing it from their public profile pending an admin decision. */
export function useFlagReview(doctorProfileId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ feedbackId, reason }: { feedbackId: string; reason: string }) =>
      consultationApi.flagReview(feedbackId, reason),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: doctorReviewsKeys.detail(doctorProfileId) });
    },
  });
}
