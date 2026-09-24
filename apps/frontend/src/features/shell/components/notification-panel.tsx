'use client';

import { AlertOctagon, AlertTriangle, Calendar, CheckCircle2, Info, Pill, Video, XCircle } from 'lucide-react';
import { useFormatter, useTranslations } from 'next-intl';
import { useMarkAllNotificationsRead } from '@/features/notifications/hooks/use-mark-all-notifications-read';
import { useMarkNotificationRead } from '@/features/notifications/hooks/use-mark-notification-read';
import { useNotifications } from '@/features/notifications/hooks/use-notifications';
import type { NotificationEntityType, NotificationEntry, NotificationSeverity } from '@/features/notifications/api/types';
import { localizeIsoTimestamps, resolveNotificationHref } from '@/features/notifications/lib/notification-text';
import { Icon } from '@/shared/icons/icon';
import { Link } from '@/shared/i18n/navigation';
import { Alert } from '@/shared/ui/alert';
import { Button } from '@/shared/ui/button';
import { EmptyState } from '@/shared/ui/empty-state';
import { PopoverClose } from '@/shared/ui/popover';
import { Skeleton } from '@/shared/ui/skeleton';
import { cn } from '@/shared/lib/cn';

const notificationRowClassName = cn(
  'flex w-full flex-col gap-1 rounded-md p-2 text-start transition-colors duration-(--duration-fast)',
  'hover:bg-secondary-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring',
  'disabled:cursor-default disabled:hover:bg-transparent',
);

// Same icon + color tokens as `Alert`'s info/success/warning/danger variants
// (shared/ui/alert.tsx) -- reused here rather than invented, so a
// notification's severity reads the same way anywhere else severity already
// appears in this app.
const severityIcon = {
  info: Info,
  success: CheckCircle2,
  warning: AlertTriangle,
  danger: XCircle,
} as const;

const severityIconClassName: Record<NotificationSeverity, string> = {
  info: 'text-info',
  success: 'text-success',
  warning: 'text-warning',
  danger: 'text-danger',
};

// Doctor UX audit remediation (Phase 5 backend proposal, now implemented):
// entityType is a distinct signal from severity -- most entity-referencing
// notifications are severity "info", so without this every one of them
// still looked identical. Purely decorative (aria-hidden): the title/
// description text already names what happened, this just gives a
// same-glance visual category next to it.
const entityTypeIcon: Record<NotificationEntityType, typeof Calendar> = {
  appointment: Calendar,
  consultation: Video,
  dispute: AlertOctagon,
  prescription: Pill,
};

export function NotificationRowContent({ notification }: { notification: NotificationEntry }) {
  const t = useTranslations('shell.notifications');
  const format = useFormatter();
  const createdAt = new Date(notification.createdAt);
  // Absolute time available on hover/focus (native `title` tooltip)
  // alongside the relative label always shown -- a quick "was this today or
  // last week" check without leaving the list.
  const absoluteTime = format.dateTime(createdAt, { dateStyle: 'medium', timeStyle: 'short' });

  return (
    <>
      <div className="flex items-center gap-2">
        <Icon
          icon={severityIcon[notification.severity]}
          size="sm"
          className={cn('shrink-0', severityIconClassName[notification.severity])}
        />
        {notification.entityType && (
          <Icon icon={entityTypeIcon[notification.entityType]} size="sm" className="shrink-0 text-text-tertiary" />
        )}
        {!notification.read && (
          <>
            {/* The dot is a visual-only cue -- `Unread` below is the text alternative assistive tech and anyone zoomed past the dot's size can rely on instead. */}
            <span className="size-1.5 shrink-0 rounded-full bg-primary" aria-hidden="true" />
            <span className="sr-only">{t('unread')}</span>
          </>
        )}
        <p className={cn('flex-1 text-sm', notification.read ? 'text-text-secondary' : 'font-medium text-text-primary')}>
          {localizeIsoTimestamps(notification.title, format)}
        </p>
      </div>
      <p className="text-sm text-text-secondary">{localizeIsoTimestamps(notification.description, format)}</p>
      <p className="text-xs text-text-tertiary" title={absoluteTime}>
        {format.relativeTime(createdAt, new Date())}
      </p>
    </>
  );
}

/**
 * A notification with an `actionUrl` (e.g. "your verification was
 * rejected" -> the onboarding wizard, "new application submitted" -> the
 * admin's case detail page) navigates there on click -- marking as read is
 * fire-and-forget alongside the navigation, never blocking it. One with no
 * `actionUrl` (nothing relevant to jump to) keeps the old mark-as-read-only
 * behavior. Shared between the bell's popover and the full Notification
 * Center page (`/notifications`) -- `closeOnNavigate` only applies inside
 * the popover, where a link click should also dismiss it; the standalone
 * page has no popover to close.
 */
export function NotificationRow({
  notification,
  closeOnNavigate = false,
}: {
  notification: NotificationEntry;
  closeOnNavigate?: boolean;
}) {
  const markAsRead = useMarkNotificationRead();
  const href = resolveNotificationHref(notification);

  if (href) {
    const link = (
      <Link
        href={href}
        onClick={() => {
          if (!notification.read) markAsRead.mutate(notification.id);
        }}
        className={notificationRowClassName}
      >
        <NotificationRowContent notification={notification} />
      </Link>
    );

    return <li>{closeOnNavigate ? <PopoverClose asChild>{link}</PopoverClose> : link}</li>;
  }

  return (
    <li>
      <button
        type="button"
        disabled={notification.read || markAsRead.isPending}
        onClick={() => markAsRead.mutate(notification.id)}
        className={notificationRowClassName}
      >
        <NotificationRowContent notification={notification} />
      </button>
    </li>
  );
}

/** The notification list inside `NotificationBell`'s popover — loading skeleton, empty state, and the real list, each notification markable as read individually or all at once. Backed by the real NotificationModule (`GET /notifications`, `POST /notifications/:id/read`, `POST /notifications/read-all`). */
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
            <NotificationRow key={notification.id} notification={notification} closeOnNavigate />
          ))}
        </ul>
      )}

      <PopoverClose asChild>
        <Link
          href="/notifications"
          className="rounded-md text-center text-sm font-medium text-primary transition-colors duration-(--duration-fast) hover:text-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
        >
          {t('viewAll')}
        </Link>
      </PopoverClose>
    </div>
  );
}

