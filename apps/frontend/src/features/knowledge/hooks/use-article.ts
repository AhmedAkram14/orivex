'use client';

import { useQuery } from '@tanstack/react-query';
import { knowledgeApi } from '@/features/knowledge/api/knowledge-api';
import { knowledgeArticlesKeys } from '@/features/knowledge/hooks/query-keys';

/** I13 -- Knowledge Center: a single article by id (used to resolve a saved-article row's title). */
export function useArticle(articleId: string) {
  return useQuery({
    queryKey: knowledgeArticlesKeys.detail(articleId),
    queryFn: () => knowledgeApi.getById(articleId),
    enabled: articleId.length > 0,
  });
}
