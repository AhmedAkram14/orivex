'use client';

import { useQuery } from '@tanstack/react-query';
import { notificationsApi } from '@/features/notifications/api/notifications-api';
import { notificationKeys } from '@/features/notifications/hooks/query-keys';

// Singleton, self-scoped resource -- mirrors `useDoctorProfile`'s own
// `detail('current')` convention for "the one record that belongs to me."
export function useNotificationPreferences() {
  return useQuery({
    queryKey: notificationKeys.detail('preferences'),
    queryFn: () => notificationsApi.getPreferences(),
  });
}
