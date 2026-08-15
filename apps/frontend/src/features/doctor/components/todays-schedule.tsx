'use client';

import { useFormatter, useTranslations } from 'next-intl';
import { useDoctorUpcomingWork } from '@/features/doctor/hooks/use-doctor-upcoming-work';
import { isSameDay } from '@/features/doctor/lib/week';
import type { UpcomingWorkItem } from '@/features/doctor/api/types';
import { getCairoNow } from '@/shared/lib/date/timezone';
import { Link } from '@/shared/i18n/navigation';
import { Alert } from '@/shared/ui/alert';
import { Avatar, AvatarFallback } from '@/shared/ui/avatar';
import { Button } from '@/shared/ui/button';
import { EmptyState } from '@/shared/ui/empty-state';
import { Skeleton } from '@/shared/ui/skeleton';
import { TimelineCard } from '@/shared/ui/layout/timeline-card';
import { WidgetContainer } from '@/shared/ui/layout/widget-container';

function initialsFor(name: string): string {
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? '';
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? '') : '';
  return (first + last).toUpperCase();
}

function StatusLabel({ status }: { status: UpcomingWorkItem['status'] }) {
  const t = useTranslations('doctor.dashboard.upcomingWork.status');
  return <>{t(status)}</>;
}

/**
 * The redesigned Overview page's "Today's Schedule" widget — the same real
 * `useDoctorUpcomingWork()` source `UpcomingWorkArea` already renders,
 * narrowed to today's local calendar day and sorted by time. `leading`
 * shows a real-name-derived avatar (the item's `title` IS the patient's
 * real display name, per `DoctorUpcomingWorkItemResponseDto`'s own doc
 * comment); `action` links to the real Patient Queue for the current/next
 * entry rather than fabricating a direct-mutation button this widget can't
 * safely wire up (an upcoming-work item and a queue session are distinct
 * backend resources with no guaranteed shared id).
 */
export function TodaysSchedule() {
  const t = useTranslations('doctor.dashboard');
  const format = useFormatter();
  const { data: items, isLoading, isError } = useDoctorUpcomingWork();

  const today = getCairoNow();
  const todaysItems = (items ?? [])
    .filter((item) => isSameDay(new Date(item.scheduledAt), today))
    .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());

  const currentOrNextId =
    todaysItems.find((item) => item.status === 'in-progress')?.id ??
    todaysItems.find((item) => item.status === 'upcoming')?.id;

  return (
    <WidgetContainer
      title={<span className="text-xl font-semibold">{t('upcomingWorkTitle')}</span>}
      className="rounded-3xl border-border-default shadow-[0_10px_30px_rgba(15,23,42,0.06)]"
    >
      {isError ? (
        <Alert variant="danger">{t('upcomingWorkLoadError')}</Alert>
      ) : isLoading ? (
        <div className="flex flex-col gap-3" aria-busy="true" aria-live="polite">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      ) : todaysItems.length > 0 ? (
        <ul className="flex flex-col gap-1">
          {todaysItems.map((item) => (
            <li key={item.id}>
              <TimelineCard
                time={format.dateTime(new Date(item.scheduledAt), { hour: 'numeric', minute: 'numeric' })}
                title={item.title}
                description={item.description}
                status={item.status}
                statusLabel={<StatusLabel status={item.status} />}
                className="rounded-xl p-3 -mx-3 transition-colors duration-(--duration-fast) hover:bg-secondary-subtle"
                leading={
                  <Avatar size="sm">
                    <AvatarFallback>{initialsFor(item.title)}</AvatarFallback>
                  </Avatar>
                }
                action={
                  item.id === currentOrNextId ? (
                    <Button asChild size="sm">
                      <Link href="/doctor/queue">{t('goToQueue')}</Link>
                    </Button>
                  ) : undefined
                }
              />
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState title={t('upcomingWorkEmptyTitle')} description={t('upcomingWorkEmptyDescription')} />
      )}
    </WidgetContainer>
  );
}
