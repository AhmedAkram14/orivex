'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '@/features/admin/api/admin-api';
import { adminKnowledgeArticlesKeys } from '@/features/admin/hooks/query-keys';

/** I13 -- Knowledge Center: the SuperAdmin's approve/reject/archive decision on an article. */
export function useModerateKnowledgeArticle() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, status, reason }: { id: string; status: 'published' | 'rejected' | 'archived'; reason: string }) =>
      adminApi.moderateKnowledgeArticle(id, status, reason),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: adminKnowledgeArticlesKeys.lists() });
    },
  });
}
