import { apiFetch } from '@/shared/lib/api/client';
import { NOTIFICATIONS_PATHS } from '@/features/notifications/api/paths';
import type { ListNotificationsResponse } from '@/features/notifications/api/types';

/**
 * The only module that talks to `/notifications/*` — mirrors `authApi`'s
 * shape (Phase 4): thin typed wrappers over `apiFetch`, no logic of their
 * own. `/notifications` is a real backend endpoint (NotificationModule's
 * NotificationController); `src/mocks/handlers/notifications.ts` still
 * intercepts it in the frontend test suite for determinism, matching
 * `mocks/handlers/auth.ts`'s established precedent for other real endpoints.
 */
export const notificationsApi = {
  list: () => apiFetch<ListNotificationsResponse>({ path: NOTIFICATIONS_PATHS.list }),

  markAsRead: (id: string) => apiFetch<void>({ method: 'POST', path: NOTIFICATIONS_PATHS.markRead(id) }),

  markAllAsRead: () => apiFetch<void>({ method: 'POST', path: NOTIFICATIONS_PATHS.markAllRead }),
};
