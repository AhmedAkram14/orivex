'use client';

import { useQuery } from '@tanstack/react-query';
import { knowledgeApi } from '@/features/knowledge/api/knowledge-api';
import { savedArticlesKeys } from '@/features/knowledge/hooks/query-keys';

/** I13 -- Knowledge Center: the patient's own saved-article list. */
export function useSavedArticles() {
  return useQuery({
    queryKey: savedArticlesKeys.list(),
    queryFn: () => knowledgeApi.listSaved(),
  });
}
