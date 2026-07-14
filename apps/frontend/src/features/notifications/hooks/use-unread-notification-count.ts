'use client';

import { useNotifications } from '@/features/notifications/hooks/use-notifications';

export function useUnreadNotificationCount(): number {
  const { data: notifications } = useNotifications();
  return notifications?.filter((notification) => !notification.read).length ?? 0;
}
