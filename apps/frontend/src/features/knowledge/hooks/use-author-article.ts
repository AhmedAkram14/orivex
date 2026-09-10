'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { knowledgeApi } from '@/features/knowledge/api/knowledge-api';
import { myArticlesKeys } from '@/features/knowledge/hooks/query-keys';
import type { AuthorArticleInput } from '@/features/knowledge/api/types';

/** I13 -- Knowledge Center: the doctor's own article-authoring action. */
export function useAuthorArticle() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: AuthorArticleInput) => knowledgeApi.author(input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: myArticlesKeys.lists() });
    },
  });
}
