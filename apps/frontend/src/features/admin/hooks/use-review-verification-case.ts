'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '@/features/admin/api/admin-api';
import { adminVerificationQueueKeys } from '@/features/admin/hooks/query-keys';
import type { ReviewVerificationCaseRequest } from '@/features/admin/api/types';

export function useReviewVerificationCase() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, request }: { id: string; request: ReviewVerificationCaseRequest }) =>
      adminApi.reviewVerificationCase(id, request),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminVerificationQueueKeys.all });
    },
  });
}
