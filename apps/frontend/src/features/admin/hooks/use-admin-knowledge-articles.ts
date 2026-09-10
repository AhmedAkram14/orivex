'use client';

import { useQuery } from '@tanstack/react-query';
import { adminApi } from '@/features/admin/api/admin-api';
import { adminKnowledgeArticlesKeys } from '@/features/admin/hooks/query-keys';
import type { KnowledgeArticleStatus } from '@/features/knowledge/api/types';

/** I13 -- Knowledge Center: the admin's own moderation queue -- defaults to PendingReview. */
export function useAdminKnowledgeArticles(status?: KnowledgeArticleStatus) {
  return useQuery({
    queryKey: adminKnowledgeArticlesKeys.list(status ?? 'pending_review'),
    queryFn: () => adminApi.listKnowledgeArticles(status),
  });
}
