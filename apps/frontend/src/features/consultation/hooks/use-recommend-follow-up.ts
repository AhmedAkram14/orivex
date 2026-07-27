'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { consultationApi } from '@/features/consultation/api/consultation-api';
import { consultationSummaryKeys } from '@/features/consultation/hooks/query-keys';

export function useRecommendFollowUp(consultationSessionId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ reason, recommendedDate }: { reason: string; recommendedDate?: string }) =>
      consultationApi.recommendFollowUp(consultationSessionId, reason, recommendedDate),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: consultationSummaryKeys.detail(consultationSessionId) });
    },
  });
}
