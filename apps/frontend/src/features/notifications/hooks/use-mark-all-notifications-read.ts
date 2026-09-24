'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { notificationsApi } from '@/features/notifications/api/notifications-api';
import { notificationKeys } from '@/features/notifications/hooks/query-keys';
import type { NotificationEntry } from '@/features/notifications/api/types';

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => notificationsApi.markAllAsRead(),
    // Optimistic: the bell's badge is derived from this cache, so flipping
    // every cached list to read makes the count disappear the moment the
    // bell is opened instead of after the refetch round trip. A failure
    // refetches the real state.
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: notificationKeys.all });
      queryClient.setQueriesData<NotificationEntry[]>({ queryKey: notificationKeys.all }, (current) =>
        Array.isArray(current) ? current.map((notification) => ({ ...notification, read: true })) : current,
      );
    },
    onError: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.all });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.all });
    },
  });
}
