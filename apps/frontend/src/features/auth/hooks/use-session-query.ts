'use client';

import { useQuery } from '@tanstack/react-query';
import { bootstrapSession, isTransientSessionError } from '@/features/auth/api/session-bootstrap';
import { sessionKeys } from '@/features/auth/hooks/query-keys';

// Render's free tier can take ~30s to wake, so the cold-start retry budget is
// deliberately generous: 4 retries at 1s/2s/4s/8s. While retrying the query
// stays `pending`, so the shell shows its loading skeleton -- never the
// "Sign in required" screen.
const SESSION_MAX_RETRIES = 4;

/** `staleTime: Infinity` — the session doesn't go stale on its own; login/logout/refresh explicitly write to this same query key rather than relying on a refetch. */
export function useSessionQuery() {
  return useQuery({
    queryKey: sessionKeys.detail('current'),
    queryFn: bootstrapSession,
    staleTime: Infinity,
    retry: (failureCount, error) => isTransientSessionError(error) && failureCount < SESSION_MAX_RETRIES,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 8000),
  });
}
