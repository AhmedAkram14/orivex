'use client';

import { AlertTriangle, CheckCircle2, Info, XCircle, type LucideIcon } from 'lucide-react';
import { useFormatter, useTranslations } from 'next-intl';
import { useNotifications } from '@/features/notifications/hooks/use-notifications';
import type { NotificationSeverity } from '@/features/notifications/api/types';
import { Alert } from '@/shared/ui/alert';
import { EmptyState } from '@/shared/ui/empty-state';
import { Icon } from '@/shared/icons/icon';
import { Skeleton } from '@/shared/ui/skeleton';
import { WidgetContainer } from '@/shared/ui/layout/widget-container';
import { cn } from '@/shared/lib/cn';

const MAX_ITEMS = 4;

/** Maps a real `NotificationEntry.severity` to an icon + accent color -- mirrors the Doctor Workspace's `RecentActivity` mapping exactly. */
const iconBySeverity: Record<NotificationSeverity, { icon: LucideIcon; accentClassName: string }> = {
  success: { icon: CheckCircle2, accentClassName: 'bg-success-subtle text-success-emphasis' },
  warning: { icon: AlertTriangle, accentClassName: 'bg-warning-subtle text-warning-emphasis' },
  danger: { icon: XCircle, accentClassName: 'bg-danger-subtle text-danger' },
  info: { icon: Info, accentClassName: 'bg-info-subtle text-info-emphasis' },
};

/**
 * The redesigned "My Health" dashboard's "Recent activity" widget — the
 * same real `useNotifications()` source the notification bell already
 * renders (appointment confirmations, prescriptions, etc.), most recent few
 * only. Never a fabricated activity feed: this app has no separate
 * activity-log module, so real notifications are the honest substitute —
 * mirrors the Doctor Workspace's own `RecentActivity` widget exactly, just
 * under the Patient Portal's own translation namespace.
 */
export function RecentActivity() {
  const t = useTranslations('patient.dashboard.activity');
  const format = useFormatter();
  const { data: notifications, isLoading, isError } = useNotifications();

  const recent = (notifications ?? []).slice(0, MAX_ITEMS);

  return (
    <WidgetContainer
      title={<span className="text-lg font-semibold">{t('title')}</span>}
      className="rounded-3xl border-border-default shadow-[0_10px_30px_rgba(15,23,42,0.06)]"
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
            const { icon, accentClassName } = iconBySeverity[notification.severity];
            return (
              <li key={notification.id} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
                <span className={cn('flex size-9 shrink-0 items-center justify-center rounded-full', accentClassName)}>
                  <Icon icon={icon} size="sm" />
                </span>
                <div className="flex flex-1 flex-col gap-0.5">
                  <p className="text-sm font-medium text-text-primary">{notification.title}</p>
                  <p className="text-sm text-text-secondary">{notification.description}</p>
                  <p className="text-xs text-text-tertiary">
                    {format.relativeTime(new Date(notification.createdAt), new Date())}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <EmptyState className="py-6" title={t('emptyTitle')} description={t('emptyDescription')} />
      )}
    </WidgetContainer>
  );
}
