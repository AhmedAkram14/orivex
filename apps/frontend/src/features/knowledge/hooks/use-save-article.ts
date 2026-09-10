'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { knowledgeApi } from '@/features/knowledge/api/knowledge-api';
import { savedArticlesKeys } from '@/features/knowledge/hooks/query-keys';

/** I13 -- Knowledge Center: a patient saving an article for later. */
export function useSaveArticle() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (articleId: string) => knowledgeApi.save(articleId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: savedArticlesKeys.lists() });
    },
  });
}
