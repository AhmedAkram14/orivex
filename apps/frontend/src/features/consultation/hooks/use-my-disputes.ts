'use client';

import { useQuery } from '@tanstack/react-query';
import { consultationApi } from '@/features/consultation/api/consultation-api';
import { myDisputesKeys } from '@/features/consultation/hooks/query-keys';

/** I11 -- Admin dispute resolution: the caller's own disputes -- either party who raised one. */
export function useMyDisputes() {
  return useQuery({
    queryKey: myDisputesKeys.list(),
    queryFn: () => consultationApi.listMyDisputes(),
  });
}
