'use client';

import { useTranslations } from 'next-intl';
import { useNotifications } from '@/features/notifications/hooks/use-notifications';
import { resolvePatientNotificationHref } from '@/features/notifications/lib/notification-text';
import { NotificationRow } from '@/features/shell/components/notification-panel';
import { Alert } from '@/shared/ui/alert';
import { Button } from '@/shared/ui/button';
import { EmptyState } from '@/shared/ui/empty-state';
import { Link } from '@/shared/i18n/navigation';
import { Skeleton } from '@/shared/ui/skeleton';
import { WidgetContainer } from '@/shared/ui/layout/widget-container';

const MAX_ITEMS = 3;

/**
 * The "My Health" dashboard's "Recent activity" widget -- the same real
 * `useNotifications()` source the notification bell renders, most recent few
 * only, through the shared `NotificationRow` (type icon, unread text
 * alternative, absolute-time tooltip, ISO timestamps localized). Each item
 * links to the most specific destination its payload allows (an appointment
 * reference deep-links to that appointment's row). Never a fabricated feed:
 * this app has no separate activity-log module.
 */
export function RecentActivity() {
  const t = useTranslations('patient.dashboard.activity');
  const { data: notifications, isLoading, isError, refetch } = useNotifications();

  const recent = (notifications ?? []).slice(0, MAX_ITEMS);

  return (
    <WidgetContainer
      title={<span className="text-lg font-semibold">{t('title')}</span>}
      titleAs="h2"
      className="rounded-3xl border-border-default shadow-[0_10px_30px_rgba(15,23,42,0.06)]"
      actions={
        <Button asChild variant="ghost" size="sm">
          <Link href="/notifications">{t('viewAll')}</Link>
        </Button>
      }
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
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      ) : recent.length > 0 ? (
        <ul className="flex flex-col divide-y divide-border-default">
          {recent.map((notification) => (
            <NotificationRow
              key={notification.id}
              notification={{ ...notification, actionUrl: resolvePatientNotificationHref(notification) }}
            />
          ))}
        </ul>
      ) : (
        <EmptyState className="py-6" title={t('emptyTitle')} description={t('emptyDescription')} />
      )}
    </WidgetContainer>
  );
}
