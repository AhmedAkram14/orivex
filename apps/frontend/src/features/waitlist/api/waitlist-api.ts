import { apiFetch } from '@/shared/lib/api/client';
import { WAITLIST_PATHS } from '@/features/waitlist/api/paths';
import type { JoinWaitlistParams, WaitlistEntry } from '@/features/waitlist/api/types';

// N8-Waitlist (ORIVEX Remaining Work Audit). A thin typed wrapper over
// `apiFetch`, mirroring `messagingApi`'s own shape.
export const waitlistApi = {
  listMine: () => apiFetch<WaitlistEntry[]>({ path: WAITLIST_PATHS.entries() }),

  join: (params: JoinWaitlistParams) =>
    apiFetch<WaitlistEntry>({ method: 'POST', path: WAITLIST_PATHS.entries(), body: params }),

  cancel: (id: string) => apiFetch<WaitlistEntry>({ method: 'DELETE', path: WAITLIST_PATHS.entry(id) }),
};
