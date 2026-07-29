'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { consultationApi } from '@/features/consultation/api/consultation-api';
import { consultationSummaryKeys, doctorReviewsKeys } from '@/features/consultation/hooks/query-keys';

/**
 * Product follow-up (2026-07-29): lets a patient correct an already-submitted
 * review. Invalidates the same two surfaces `useSubmitConsultationFeedback`
 * does -- the realtime `doctor-reviews.changed` push (see use-realtime-
 * socket.ts) covers the doctor's own client; this covers the editing
 * patient's own client in the same session.
 */
export function useUpdateConsultationFeedback(consultationSessionId: string, doctorProfileId?: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ rating, comment }: { rating: number; comment?: string }) =>
      consultationApi.updateFeedback(consultationSessionId, rating, comment),
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
