'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { consultationApi } from '@/features/consultation/api/consultation-api';
import type { RecordLabRequestInput } from '@/features/consultation/api/types';
import { consultationSummaryKeys } from '@/features/consultation/hooks/query-keys';

/**
 * I1 -- Lab Requests (docs/01-prd.md §2.9 "Lightweight in V1"): the write
 * side of the doctor's Lab Requests authoring UI, mirroring
 * `useSignPrescription`'s invalidation shape -- refreshes this session's own
 * summary so the newly-ordered test appears immediately, in the same
 * consultation workspace, without a manual refresh.
 */
export function useRecordLabRequest(consultationSessionId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: RecordLabRequestInput) => consultationApi.recordLabRequest(consultationSessionId, input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: consultationSummaryKeys.detail(consultationSessionId) });
    },
  });
}
