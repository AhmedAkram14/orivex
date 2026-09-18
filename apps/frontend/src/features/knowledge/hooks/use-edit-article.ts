'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { knowledgeApi } from '@/features/knowledge/api/knowledge-api';
import { myArticlesKeys } from '@/features/knowledge/hooks/query-keys';
import type { EditArticleInput } from '@/features/knowledge/api/types';

/** Knowledge Center Hardening Phase 3: the doctor's own edit-in-place action -- mirrors `useAuthorArticle`'s exact shape. */
export function useEditArticle() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: EditArticleInput }) => knowledgeApi.edit(id, input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: myArticlesKeys.lists() });
    },
  });
}
