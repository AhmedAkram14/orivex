'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useMarkAllNotificationsRead } from '@/features/notifications/hooks/use-mark-all-notifications-read';
import { useNotificationsPage } from '@/features/notifications/hooks/use-notifications-page';
import { NotificationRow } from '@/features/shell/components/notification-panel';
import { Alert } from '@/shared/ui/alert';
import { Button } from '@/shared/ui/button';
import { EmptyState } from '@/shared/ui/empty-state';
import { Pagination } from '@/shared/ui/pagination';
import { Skeleton } from '@/shared/ui/skeleton';

const PAGE_SIZE = 5;

/**
 * The Notification Center page's (`/notifications`) real list — the
 * previously-unreachable-beyond-50 full history, paginated via the same
 * real `page`/`limit` the backend's `NotificationController` already
 * supported (Notification Center pagination fix). Reuses `NotificationRow`
 * from the bell's popover rather than duplicating its row JSX -- unread dot,
 * severity icon, mark-as-read/navigate behavior are identical here, just
 * outside a `Popover`.
 */
export function NotificationCenterList() {
  const t = useTranslations('notificationCenter');
  const [page, setPage] = useState(1);
  const { data, isLoading, isError } = useNotificationsPage({ page, limit: PAGE_SIZE });
  const markAllAsRead = useMarkAllNotificationsRead();
  const unreadCount = data?.notifications.filter((notification) => !notification.read).length ?? 0;

  if (isError) {
    return <Alert variant="danger">{t('loadError')}</Alert>;
  }

  if (isLoading) {
    return (
      <div className="flex flex-col gap-2" aria-busy="true" aria-live="polite">
        {Array.from({ length: 5 }).map((_, index) => (
          <Skeleton key={index} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  if (!data || data.notifications.length === 0) {
    return <EmptyState title={t('emptyTitle')} description={t('emptyDescription')} />;
  }

  const pageCount = Math.max(1, Math.ceil(data.total / PAGE_SIZE));

  return (
    <div className="flex flex-col gap-4">
      {unreadCount > 0 && (
        <div className="flex justify-end">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            loading={markAllAsRead.isPending}
            onClick={() => markAllAsRead.mutate()}
          >
            {t('markAllRead')}
          </Button>
        </div>
      )}

      <ul className="flex flex-col gap-1">
        {data.notifications.map((notification) => (
          <NotificationRow key={notification.id} notification={notification} />
        ))}
      </ul>

      <Pagination page={page} pageCount={pageCount} onPageChange={setPage} />
    </div>
  );
}
