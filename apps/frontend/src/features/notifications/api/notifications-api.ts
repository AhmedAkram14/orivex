import { apiFetch } from '@/shared/lib/api/client';
import { NOTIFICATIONS_PATHS } from '@/features/notifications/api/paths';
import type { ListNotificationsResponse } from '@/features/notifications/api/types';

/**
 * The only module that talks to `/notifications/*` — mirrors `authApi`'s
 * shape (Phase 4): thin typed wrappers over `apiFetch`, no logic of their
 * own. Backed by an MSW mock today (`src/mocks/handlers/notifications.ts`);
 * real backend delivery is Phase 14's own scope (🔒 Blocked — no
 * Notification module exists yet), so swapping this later is a change to
 * these function bodies only.
 */
export const notificationsApi = {
  list: () => apiFetch<ListNotificationsResponse>({ path: NOTIFICATIONS_PATHS.list }),

  markAsRead: (id: string) => apiFetch<void>({ method: 'POST', path: NOTIFICATIONS_PATHS.markRead(id) }),

  markAllAsRead: () => apiFetch<void>({ method: 'POST', path: NOTIFICATIONS_PATHS.markAllRead }),
};
