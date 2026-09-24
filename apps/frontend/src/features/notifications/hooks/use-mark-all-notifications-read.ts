'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { notificationsApi } from '@/features/notifications/api/notifications-api';
import { notificationKeys } from '@/features/notifications/hooks/query-keys';
import type { ListNotificationsResult } from '@/features/notifications/api/types';

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
      // The cached value is the API result (`{ notifications, total, ... }`);
      // `useNotifications`'s `select` only unwraps it when read.
      queryClient.setQueriesData<ListNotificationsResult>({ queryKey: notificationKeys.all }, (current) =>
        current && Array.isArray(current.notifications)
          ? { ...current, notifications: current.notifications.map((notification) => ({ ...notification, read: true })) }
          : current,
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
