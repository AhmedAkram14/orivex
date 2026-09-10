'use client';

import { useQuery } from '@tanstack/react-query';
import { knowledgeApi } from '@/features/knowledge/api/knowledge-api';
import { myArticlesKeys } from '@/features/knowledge/hooks/query-keys';

/** I13 -- Knowledge Center: the authoring doctor's own articles, any status. */
export function useMyArticles() {
  return useQuery({
    queryKey: myArticlesKeys.list(),
    queryFn: () => knowledgeApi.listMine(),
  });
}
