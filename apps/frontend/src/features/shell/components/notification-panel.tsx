'use client';

import { useFormatter, useTranslations } from 'next-intl';
import { useMarkAllNotificationsRead } from '@/features/notifications/hooks/use-mark-all-notifications-read';
import { useMarkNotificationRead } from '@/features/notifications/hooks/use-mark-notification-read';
import { useNotifications } from '@/features/notifications/hooks/use-notifications';
import type { NotificationEntry } from '@/features/notifications/api/types';
import { Alert } from '@/shared/ui/alert';
import { Button } from '@/shared/ui/button';
import { EmptyState } from '@/shared/ui/empty-state';
import { Skeleton } from '@/shared/ui/skeleton';
import { cn } from '@/shared/lib/cn';

function NotificationRow({ notification }: { notification: NotificationEntry }) {
  const format = useFormatter();
  const markAsRead = useMarkNotificationRead();

  return (
    <li>
      <button
        type="button"
        disabled={notification.read || markAsRead.isPending}
        onClick={() => markAsRead.mutate(notification.id)}
        className={cn(
          'flex w-full flex-col gap-1 rounded-md p-2 text-start transition-colors',
          'hover:bg-secondary-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring',
          'disabled:cursor-default disabled:hover:bg-transparent',
        )}
      >
        <div className="flex items-center gap-2">
          {!notification.read && <span className="size-1.5 shrink-0 rounded-full bg-primary" aria-hidden="true" />}
          <p className={cn('flex-1 text-sm', notification.read ? 'text-text-secondary' : 'font-medium text-text-primary')}>
            {notification.title}
          </p>
        </div>
        <p className="text-sm text-text-secondary">{notification.description}</p>
        <p className="text-xs text-text-tertiary">{format.relativeTime(new Date(notification.createdAt), new Date())}</p>
      </button>
    </li>
  );
}

/** The notification list inside `NotificationBell`'s popover — loading skeleton, empty state, and the real list, each notification markable as read individually or all at once. Backed by MSW's mock `/notifications/*` today (Phase 14 is 🔒 Blocked on a real Notification module); the UI itself is real and working. */
export function NotificationPanel() {
  const t = useTranslations('shell.notifications');
  const { data: notifications, isLoading, isError } = useNotifications();
  const markAllAsRead = useMarkAllNotificationsRead();
  const unreadCount = notifications?.filter((notification) => !notification.read).length ?? 0;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-semibold text-text-primary">{t('title')}</p>
        {unreadCount > 0 && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            loading={markAllAsRead.isPending}
            onClick={() => markAllAsRead.mutate()}
          >
            {t('markAllRead')}
          </Button>
        )}
      </div>

      {isLoading && (
        <div className="flex flex-col gap-2" aria-busy="true" aria-live="polite">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      )}

      {isError && <Alert variant="danger">{t('loadError')}</Alert>}

      {!isLoading && !isError && notifications && notifications.length === 0 && (
        <EmptyState title={t('emptyTitle')} description={t('emptyDescription')} />
      )}

      {!isLoading && !isError && notifications && notifications.length > 0 && (
        <ul className="flex max-h-80 flex-col gap-1 overflow-y-auto">
          {notifications.map((notification) => (
            <NotificationRow key={notification.id} notification={notification} />
          ))}
        </ul>
      )}
    </div>
  );
}

