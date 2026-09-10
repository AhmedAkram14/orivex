'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '@/features/admin/api/admin-api';
import { adminReviewsKeys } from '@/features/admin/hooks/query-keys';

/** I11 -- Admin content moderation: the SuperAdmin's own decision on a flagged review. */
export function useModerateReview() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, status, reason }: { id: string; status: 'visible' | 'hidden'; reason: string }) =>
      adminApi.moderateReview(id, status, reason),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: adminReviewsKeys.lists() });
    },
  });
}
