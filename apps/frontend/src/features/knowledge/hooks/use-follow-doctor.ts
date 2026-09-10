'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { knowledgeApi } from '@/features/knowledge/api/knowledge-api';
import { followedDoctorsKeys } from '@/features/knowledge/hooks/query-keys';

/** I13 -- Knowledge Center: a patient following a doctor's future published content. */
export function useFollowDoctor() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (doctorId: string) => knowledgeApi.followDoctor(doctorId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: followedDoctorsKeys.lists() });
    },
  });
}
