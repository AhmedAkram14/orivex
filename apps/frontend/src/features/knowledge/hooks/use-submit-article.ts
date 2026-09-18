'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { knowledgeApi } from '@/features/knowledge/api/knowledge-api';
import { myArticlesKeys } from '@/features/knowledge/hooks/query-keys';

/** Knowledge Center Hardening Phase 3: submits a Draft for review -- mirrors `useAuthorArticle`'s exact shape. */
export function useSubmitArticle() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => knowledgeApi.submit(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: myArticlesKeys.lists() });
    },
  });
}
