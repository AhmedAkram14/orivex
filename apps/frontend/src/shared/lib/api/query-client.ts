import { MutationCache, QueryCache, QueryClient } from '@tanstack/react-query';
import { ApiError } from '@/shared/lib/api/client';
import { reportQueryError } from '@/shared/lib/api/error';

/**
 * One QueryClient per browser tab (created inside a component via useState,
 * see QueryProvider) — never a module-level singleton, which would leak
 * cached data across users/requests during SSR. Defaults are conservative
 * on purpose: healthcare data (appointment status, an AI suggestion's
 * acknowledgment state) must not be served confidently stale the way a
 * marketing site's content safely can be (mirrors Phase 27's caching-
 * strategy rule) — refetch-on-window-focus stays on, retry is limited
 * rather than TanStack Query's default of 3 blind retries against a
 * possibly-genuinely-failing backend.
 */
export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        retry: 1,
        refetchOnWindowFocus: true,
      },
      mutations: {
        retry: 0,
      },
    },
    // Centralized error reporting so individual features don't each wire
    // their own onError -> toast plumbing (Phase 2's "single error-handling
    // convention" requirement). A query/mutation can still handle its own
    // error locally (e.g. a form's field-level message) via its own
    // onError/try-catch; this is the catch-all, not a replacement.
    queryCache: new QueryCache({
      onError: (error) => reportQueryError(error),
    }),
    mutationCache: new MutationCache({
      onError: (error) => reportQueryError(error),
    }),
  });
}

export { ApiError };
