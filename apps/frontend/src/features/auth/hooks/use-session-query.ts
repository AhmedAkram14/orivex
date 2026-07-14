'use client';

import { useQuery } from '@tanstack/react-query';
import { bootstrapSession } from '@/features/auth/api/session-bootstrap';
import { sessionKeys } from '@/features/auth/hooks/query-keys';

/** `staleTime: Infinity` — the session doesn't go stale on its own; login/logout/refresh explicitly write to this same query key rather than relying on a refetch. */
export function useSessionQuery() {
  return useQuery({
    queryKey: sessionKeys.detail('current'),
    queryFn: bootstrapSession,
    staleTime: Infinity,
    retry: false,
  });
}
