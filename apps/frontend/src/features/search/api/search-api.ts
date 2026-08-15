import { apiFetch } from '@/shared/lib/api/client';
import { SEARCH_PATHS } from '@/features/search/api/paths';
import type { GlobalSearchParams, SearchResponseDto } from '@/features/search/api/types';

function buildSearchQuery({ q, type, limit }: GlobalSearchParams): string {
  const query = new URLSearchParams();
  query.set('q', q);
  if (type) query.set('type', type);
  if (limit) query.set('limit', String(limit));
  return `${SEARCH_PATHS.search}?${query.toString()}`;
}

/**
 * The only module that talks to `/search` -- mirrors `doctorApi`'s shape: a
 * single typed wrapper over `apiFetch`. Real backend endpoint (ORIVEX
 * Roadmap Phase 2 -- Real Global Search); `src/mocks/handlers/search.ts`
 * intercepts it only to keep the frontend test suite deterministic, same
 * precedent as every other real, already-shipped endpoint in this codebase.
 */
export const searchApi = {
  search: (params: GlobalSearchParams) => apiFetch<SearchResponseDto>({ path: buildSearchQuery(params) }),
};
