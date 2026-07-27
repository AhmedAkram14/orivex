'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { consultationApi } from '@/features/consultation/api/consultation-api';
import { consultationSummaryKeys } from '@/features/consultation/hooks/query-keys';

export function useRecordNote(consultationSessionId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (content: string) => consultationApi.recordNote(consultationSessionId, content),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: consultationSummaryKeys.detail(consultationSessionId) });
    },
  });
}
