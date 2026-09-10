'use client';

import { useQuery } from '@tanstack/react-query';
import { knowledgeApi } from '@/features/knowledge/api/knowledge-api';
import { followedDoctorsKeys } from '@/features/knowledge/hooks/query-keys';

/** I13 -- Knowledge Center: the patient's own followed-doctors list. */
export function useFollowedDoctors() {
  return useQuery({
    queryKey: followedDoctorsKeys.list(),
    queryFn: () => knowledgeApi.listFollowed(),
  });
}
