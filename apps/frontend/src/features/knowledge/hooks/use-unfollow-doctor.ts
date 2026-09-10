'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { knowledgeApi } from '@/features/knowledge/api/knowledge-api';
import { followedDoctorsKeys } from '@/features/knowledge/hooks/query-keys';

/** I13 -- Knowledge Center: a patient unfollowing a doctor. */
export function useUnfollowDoctor() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (doctorId: string) => knowledgeApi.unfollowDoctor(doctorId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: followedDoctorsKeys.lists() });
    },
  });
}
