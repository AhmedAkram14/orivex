'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { knowledgeApi } from '@/features/knowledge/api/knowledge-api';
import { savedArticlesKeys } from '@/features/knowledge/hooks/query-keys';

/** I13 -- Knowledge Center: a patient removing a previously saved article. */
export function useUnsaveArticle() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (articleId: string) => knowledgeApi.unsave(articleId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: savedArticlesKeys.lists() });
    },
  });
}
