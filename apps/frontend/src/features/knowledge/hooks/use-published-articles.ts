'use client';

import { useQuery } from '@tanstack/react-query';
import { knowledgeApi } from '@/features/knowledge/api/knowledge-api';
import { knowledgeArticlesKeys } from '@/features/knowledge/hooks/query-keys';
import type { ListPublishedArticlesParams } from '@/features/knowledge/api/types';

/** I13 -- Knowledge Center: the public/patient-facing feed, Published only. */
export function usePublishedArticles(params: ListPublishedArticlesParams = {}) {
  // `language` is already threaded through `ListPublishedArticlesParams` and
  // `knowledgeApi.listPublished` -- this hook just needs to include it in
  // the query key so switching the filter refetches.
  return useQuery({
    queryKey: knowledgeArticlesKeys.list(params),
    queryFn: () => knowledgeApi.listPublished(params),
  });
}
