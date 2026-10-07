'use client';

import { useSearchParams } from 'next/navigation';
import { useCallback, useMemo, useTransition } from 'react';
import { parseDoctorSearch, serializeDoctorSearch, type DoctorSearchState } from '@/features/public-site/lib/doctor-search-params';
import { usePathname, useRouter } from '@/shared/i18n/navigation';

/**
 * The URL is the single source of truth for the filters: reading parses the
 * current search params, writing replaces them (no history entry per tick,
 * no scroll jump). Any change other than paging returns to page 1.
 */
export function useDoctorSearch() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const state = useMemo(() => parseDoctorSearch(new URLSearchParams(searchParams.toString())), [searchParams]);

  const replaceWith = useCallback(
    (next: DoctorSearchState) => {
      const query = serializeDoctorSearch(next);
      startTransition(() => router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false }));
    },
    [pathname, router],
  );

  const update = useCallback(
    (patch: Partial<DoctorSearchState>) => replaceWith({ ...state, page: undefined, ...patch }),
    [replaceWith, state],
  );

  /** Clears every filter and the search text; `keep` survives (a specialty page keeps its own specialty). */
  const clear = useCallback((keep: Partial<DoctorSearchState> = {}) => replaceWith({ sort: state.sort, ...keep }), [replaceWith, state.sort]);

  return { state, update, clear, isPending };
}
