'use client';

import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { searchApi } from '@/features/search/api/search-api';
import { searchKeys } from '@/features/search/hooks/query-keys';
import type { SearchResultType } from '@/features/search/api/types';

const DEBOUNCE_MS = 300;
const MIN_QUERY_LENGTH = 2;

/**
 * Debounces a fast-changing value by `delayMs`, only committing it once it's
 * held steady. No existing debounce utility/hook exists in this codebase
 * (checked before adding this) -- a small local `setTimeout`-based one, not
 * a new dependency.
 */
function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}

export interface UseGlobalSearchParams {
  q: string;
  type?: SearchResultType;
}

/**
 * `GET /search` (ORIVEX Roadmap Phase 2 -- Real Global Search), debounced
 * ~300ms and gated at 2+ trimmed characters -- a client-side mirror of the
 * backend's own contract ("q shorter than 2 characters after trim returns
 * `{ results: [], total: 0 }` without even querying the DB"), so the
 * frontend doesn't bother firing the request either in that case.
 */
export function useGlobalSearch({ q, type }: UseGlobalSearchParams) {
  const debouncedQuery = useDebouncedValue(q.trim(), DEBOUNCE_MS);
  const enabled = debouncedQuery.length >= MIN_QUERY_LENGTH;

  return useQuery({
    queryKey: searchKeys.list({ q: debouncedQuery, type }),
    queryFn: () => searchApi.search({ q: debouncedQuery, type }),
    enabled,
  });
}
