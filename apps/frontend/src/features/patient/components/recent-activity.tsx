'use client';

import { useFormatter, useTranslations } from 'next-intl';
import type { NotificationEntry } from '@/features/notifications/api/types';
import { useLocalizedNotification, useViewerIsDoctor } from '@/features/notifications/hooks/use-localized-notification';
import { isPersonalNotification } from '@/features/notifications/lib/notification-audience';
import { useMarkNotificationRead } from '@/features/notifications/hooks/use-mark-notification-read';
import { useNotifications } from '@/features/notifications/hooks/use-notifications';
import { localizeIsoTimestamps, resolveNotificationHref } from '@/features/notifications/lib/notification-text';
import { CardHeaderLink, OverviewList, OverviewRow, UnreadDot } from '@/features/patient/components/overview-list';
import { notificationTypeIcon } from '@/features/shell/components/notification-panel';
import { Alert } from '@/shared/ui/alert';
import { EmptyState } from '@/shared/ui/empty-state';
import { Skeleton } from '@/shared/ui/skeleton';
import { WidgetContainer } from '@/shared/ui/layout/widget-container';

const MAX_ITEMS = 4;

/**
 * One notification as an Overview row: what it is about as the glyph (in ink -- the severity is in the
 * words, not a colour), its title and description, the relative time (absolute on hover), and an unread
 * dot at the inline end. Opening it goes to what it is about and marks it read; one with nowhere to go
 * is a button that only marks it read -- the same behaviour as the bell and the Notifications page.
 */
function ActivityRow({ notification }: { notification: NotificationEntry }) {
  const t = useTranslations('shell.notifications');
  const format = useFormatter();
  const localize = useLocalizedNotification();
  const markAsRead = useMarkNotificationRead();
  const text = localize(notification);
  const createdAt = new Date(notification.createdAt);
  const href = resolveNotificationHref(notification);
  // About the account's own care when it also practises as a doctor -- the same tag the bell shows.
  const personal = isPersonalNotification(notification, useViewerIsDoctor());
  const markRead = () => {
    if (!notification.read) markAsRead.mutate(notification.id);
  };

  return (
    <OverviewRow
      icon={notificationTypeIcon(notification)}
      title={
        <>
          {localizeIsoTimestamps(text.title, format)}
          {personal && (
            <span className="ms-2 rounded-full bg-surface-2 px-2 py-0.5 align-middle text-caption font-medium text-text-secondary">{t('personalTag')}</span>
          )}
        </>
      }
      body={localizeIsoTimestamps(text.description, format)}
      meta={format.relativeTime(createdAt, new Date())}
      metaTitle={format.dateTime(createdAt, { dateStyle: 'medium', timeStyle: 'short' })}
      trailing={notification.read ? undefined : <UnreadDot label={t('unread')} />}
      href={href}
      onClick={markRead}
      disabled={!href && (notification.read || markAsRead.isPending)}
    />
  );
}

export function RecentActivity({ className }: { className?: string }) {
  const t = useTranslations('patient.dashboard.activity');
  const { data: notifications, isLoading, isError, refetch } = useNotifications();

  const recent = (notifications ?? []).slice(0, MAX_ITEMS);

  return (
    <WidgetContainer
      title={<span className="text-h3">{t('title')}</span>}
      titleAs="h2"
      className={className}
      actions={<CardHeaderLink href="/notifications" label={t('viewAll')} context={t('title')} />}
    >
      {isError ? (
        <Alert variant="danger">
          <span>{t('loadError')}</span>{' '}
          <button type="button" className="font-medium underline" onClick={() => refetch()}>
            {t('retry')}
          </button>
        </Alert>
      ) : isLoading ? (
        <div className="flex flex-col gap-3" aria-busy="true" aria-live="polite">
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
        </div>
      ) : recent.length > 0 ? (
        <OverviewList>
          {recent.map((notification) => (
            <ActivityRow key={notification.id} notification={notification} />
          ))}
        </OverviewList>
      ) : (
        <EmptyState illustration="inbox-quiet" size="sm" title={t('emptyTitle')} description={t('emptyDescription')} />
      )}
    </WidgetContainer>
  );
}
