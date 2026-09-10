'use client';

import { useQuery } from '@tanstack/react-query';
import { knowledgeApi } from '@/features/knowledge/api/knowledge-api';
import { knowledgeArticlesKeys } from '@/features/knowledge/hooks/query-keys';
import type { ListPublishedArticlesParams } from '@/features/knowledge/api/types';

/** I13 -- Knowledge Center: the public/patient-facing feed, Published only. */
export function usePublishedArticles(params: ListPublishedArticlesParams = {}) {
  return useQuery({
    queryKey: knowledgeArticlesKeys.list(params),
    queryFn: () => knowledgeApi.listPublished(params),
  });
}
