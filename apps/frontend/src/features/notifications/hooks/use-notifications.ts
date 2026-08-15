'use client';

import { useQuery } from '@tanstack/react-query';
import { notificationsApi } from '@/features/notifications/api/notifications-api';
import { notificationKeys } from '@/features/notifications/hooks/query-keys';

// `NotificationBell` keeps this query mounted the whole time a user is in
// the app (for the unread-count badge), but the global QueryClient has no
// polling by default -- without it, a notification created while the user
// is already on the page (e.g. their verification just got decided) never
// surfaces until something else happens to refetch it (a window refocus,
// a remount), which reads as "I only find out if I happen to open the
// bell." Polling every 30s (matching the global staleTime) is the
// pragmatic fix here, short of the real-time push layer this roadmap
// defers to its own future stage -- pauses automatically while the tab is
// in the background (TanStack Query's own default).
const POLL_INTERVAL_MS = 30_000;

export function useNotifications() {
  return useQuery({
    queryKey: notificationKeys.list(),
    queryFn: () => notificationsApi.list(),
    // Unwraps to the plain array `NotificationBell`/`NotificationPanel` have
    // always consumed -- `notificationsApi.list()`'s real return shape now
    // also carries `total`/`page`/`limit` (Notification Center pagination
    // fix), but the bell's own capped view never needed those.
    select: (result) => result.notifications,
    refetchInterval: POLL_INTERVAL_MS,
  });
}
