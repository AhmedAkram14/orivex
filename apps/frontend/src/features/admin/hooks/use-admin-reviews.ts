'use client';

import { useQuery } from '@tanstack/react-query';
import { adminApi } from '@/features/admin/api/admin-api';
import { adminReviewsKeys } from '@/features/admin/hooks/query-keys';

/** I11 -- Admin content moderation: the moderation queue -- defaults to Flagged. */
export function useAdminReviews(status?: 'visible' | 'flagged' | 'hidden') {
  return useQuery({
    queryKey: adminReviewsKeys.list(status ?? 'flagged'),
    queryFn: () => adminApi.listReviews(status),
  });
}
