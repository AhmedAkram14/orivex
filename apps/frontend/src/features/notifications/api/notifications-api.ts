import { apiFetch, apiFetchWithMeta } from '@/shared/lib/api/client';
import { NOTIFICATIONS_PATHS } from '@/features/notifications/api/paths';
import type {
  ListNotificationsParams,
  ListNotificationsResult,
  NotificationEntry,
} from '@/features/notifications/api/types';

function buildNotificationsQuery(params: ListNotificationsParams): string {
  const query = new URLSearchParams();
  if (params.page) query.set('page', String(params.page));
  if (params.limit) query.set('limit', String(params.limit));
  const qs = query.toString();
  return qs ? `${NOTIFICATIONS_PATHS.list}?${qs}` : NOTIFICATIONS_PATHS.list;
}

/**
 * The only module that talks to `/notifications/*` — mirrors `authApi`'s
 * shape (Phase 4): thin typed wrappers over `apiFetch`, no logic of their
 * own. `/notifications` is a real backend endpoint (NotificationModule's
 * NotificationController); `src/mocks/handlers/notifications.ts` still
 * intercepts it in the frontend test suite for determinism, matching
 * `mocks/handlers/auth.ts`'s established precedent for other real endpoints.
 */
export const notificationsApi = {
  // Real offset pagination (Notification Center gap fix) -- the backend
  // already supported page/limit (defaults 1/50) and returned `total` on
  // the envelope's `meta`, but that was previously discarded by `apiFetch`,
  // making anything past the first 50 notifications unreachable. Uses
  // `apiFetchWithMeta` to recover `total` and folds it into one object,
  // same shape `useAdminPayments`'s callers already consume.
  list: (params: ListNotificationsParams = {}) =>
    apiFetchWithMeta<NotificationEntry[]>({ path: buildNotificationsQuery(params) }).then(
      ({ data, meta }): ListNotificationsResult => ({
        notifications: data,
        total: meta.total ?? data.length,
        page: meta.page ?? params.page ?? 1,
        limit: meta.limit ?? params.limit ?? data.length,
      }),
    ),

  markAsRead: (id: string) => apiFetch<void>({ method: 'POST', path: NOTIFICATIONS_PATHS.markRead(id) }),

  markAllAsRead: () => apiFetch<void>({ method: 'POST', path: NOTIFICATIONS_PATHS.markAllRead }),
};
