'use client';

import { useFormatter, useTranslations } from 'next-intl';
import { useLocalizedNotification, useViewerIsDoctor } from '@/features/notifications/hooks/use-localized-notification';
import { isPersonalNotification } from '@/features/notifications/lib/notification-audience';
import { notificationTypeIcon } from '@/features/shell/components/notification-panel';
import { Link } from '@/shared/i18n/navigation';
import { Button } from '@/shared/ui/button';
import { useNotifications } from '@/features/notifications/hooks/use-notifications';
import type { NotificationSeverity } from '@/features/notifications/api/types';
import { Alert } from '@/shared/ui/alert';
import { EmptyState } from '@/shared/ui/empty-state';
import { Icon } from '@/shared/icons/icon';
import { Skeleton } from '@/shared/ui/skeleton';
import { WidgetContainer } from '@/shared/ui/layout/widget-container';
import { cn } from '@/shared/lib/cn';

const MAX_ITEMS = 5;

/** The row's one icon is the shared type icon (`notificationTypeIcon`); its tint is the real `severity`. */
const accentBySeverity: Record<NotificationSeverity, string> = {
  success: 'bg-success-subtle text-success-emphasis',
  warning: 'bg-warning-subtle text-warning-emphasis',
  danger: 'bg-danger-subtle text-danger-emphasis',
  info: 'bg-info-subtle text-info-emphasis',
};

/**
 * The redesigned Overview page's "Recent Activity" widget — the same real
 * `useNotifications()` source `NotificationPanel` already renders, most
 * recent few with relative timestamps, now as timeline rows (colored icon
 * per real `severity`, thin divider between rows). Never a fabricated
 * activity feed: this app has no separate activity-log module, so real
 * notifications are the honest substitute.
 */
export function RecentActivity() {
  const t = useTranslations('doctor.dashboard.activity');
  const tNotifications = useTranslations('shell.notifications');
  const format = useFormatter();
  const { data: notifications, isLoading, isError } = useNotifications();
  const localize = useLocalizedNotification();

  const viewerIsDoctor = useViewerIsDoctor();
  // The clinical feed only: this account's own-care (patient-side) notifications live under "Personal" in the bell.
  const recent = (notifications ?? []).filter((entry) => !isPersonalNotification(entry, viewerIsDoctor)).slice(0, MAX_ITEMS);

  return (
    <WidgetContainer
      title={<span className="text-xl font-semibold">{t('title')}</span>}
      // Sizes to its content (at most 5 rows) -- no fixed height, no inner scroll.
      className="rounded-(--r-card) border-border-default shadow-sm"
      actions={
        <Button asChild variant="ghost" size="sm">
          <Link href="/notifications">{t('viewAll')}</Link>
        </Button>
      }
    >
      {isError ? (
        <Alert variant="danger">{t('loadError')}</Alert>
      ) : isLoading ? (
        <div className="flex flex-col gap-3" aria-busy="true" aria-live="polite">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      ) : recent.length > 0 ? (
        <ul className="flex flex-col divide-y divide-border-default">
          {recent.map((notification) => {
            const text = localize(notification);
            return (
              <li key={notification.id} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
                <span className={cn('flex size-9 shrink-0 items-center justify-center rounded-full', accentBySeverity[notification.severity])}>
                  <Icon icon={notificationTypeIcon(notification)} size="sm" />
                </span>
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <p className="flex items-center gap-2 text-sm font-medium text-text-primary">
                    {!notification.read && (
                      <>
                        {/* Visual-only cue, as in the bell; "Unread" is its text alternative. */}
                        <span className="size-1.5 shrink-0 rounded-full bg-primary" aria-hidden="true" />
                        <span className="sr-only">{tNotifications('unread')}</span>
                      </>
                    )}
                    <span className="min-w-0">{text.title}</span>
                  </p>
                  <p className="text-sm text-text-secondary">{text.description}</p>
                  <p className="text-xs text-text-tertiary">
                    {format.relativeTime(new Date(notification.createdAt), new Date())}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <EmptyState illustration="inbox-quiet" size="sm" title={t('emptyTitle')} description={t('emptyDescription')} />
      )}
    </WidgetContainer>
  );
}
