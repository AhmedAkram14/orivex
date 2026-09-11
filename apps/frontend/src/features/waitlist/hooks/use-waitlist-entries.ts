'use client';

import { useQuery } from '@tanstack/react-query';
import { waitlistApi } from '@/features/waitlist/api/waitlist-api';
import { waitlistEntriesKeys } from '@/features/waitlist/hooks/query-keys';

/** The caller's own waitlist entries. */
export function useWaitlistEntries() {
  return useQuery({
    queryKey: waitlistEntriesKeys.list(),
    queryFn: () => waitlistApi.listMine(),
  });
}
