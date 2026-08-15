'use client';

import { useQuery } from '@tanstack/react-query';
import { notificationsApi } from '@/features/notifications/api/notifications-api';
import { notificationKeys } from '@/features/notifications/hooks/query-keys';
import type { ListNotificationsParams } from '@/features/notifications/api/types';

/**
 * Backs the Notification Center page (`/notifications`) — the full,
 * paginated list, distinct from `useNotifications`' capped/unwrapped view
 * that only the bell's popover needs. Mirrors `useAdminPayments`' shape:
 * caller owns `page`/`limit` state, this just fetches that page and exposes
 * `total` for real pagination controls.
 */
export function useNotificationsPage(params: Required<ListNotificationsParams>) {
  return useQuery({
    queryKey: notificationKeys.list(params),
    queryFn: () => notificationsApi.list(params),
  });
}
