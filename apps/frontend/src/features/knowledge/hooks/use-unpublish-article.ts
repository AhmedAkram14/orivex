'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { knowledgeApi } from '@/features/knowledge/api/knowledge-api';
import { myArticlesKeys } from '@/features/knowledge/hooks/query-keys';

/** Knowledge Center Hardening Phase 3: doctor-initiated archive of a Published article -- mirrors `useAuthorArticle`'s exact shape. */
export function useUnpublishArticle() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => knowledgeApi.unpublish(id, reason),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: myArticlesKeys.lists() });
    },
  });
}
