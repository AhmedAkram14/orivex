'use client';

import { useFormatter, useTranslations } from 'next-intl';
import { useDoctorUpcomingWork } from '@/features/doctor/hooks/use-doctor-upcoming-work';
import { isSameDay } from '@/features/doctor/lib/week';
import type { UpcomingWorkItem } from '@/features/doctor/api/types';
import { getCairoNow } from '@/shared/lib/date/timezone';
import { Link } from '@/shared/i18n/navigation';
import { Alert } from '@/shared/ui/alert';
import { PersonAvatar } from '@/shared/ui/avatar';
import { Button } from '@/shared/ui/button';
import { Skeleton } from '@/shared/ui/skeleton';
import { TimelineCard } from '@/shared/ui/layout/timeline-card';
import { WidgetContainer } from '@/shared/ui/layout/widget-container';

/** The Overview shows a few rows and links to the rest, so it ends near its neighbour (the Patient Queue). */
const MAX_ITEMS = 3;

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
 *
 * At most three rows: the visit in progress (or the next one) and what follows;
 * once the day is done, its last three. "View all" opens Appointments.
 */
export function TodaysSchedule() {
  const t = useTranslations('doctor.dashboard');
  const format = useFormatter();
  const { data: items, isLoading, isError } = useDoctorUpcomingWork();

  const today = getCairoNow();
  const todaysItems = (items ?? [])
    .filter((item) => isSameDay(getCairoNow(new Date(item.scheduledAt)), today))
    .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());

  const currentOrNextId =
    todaysItems.find((item) => item.status === 'in-progress')?.id ??
    todaysItems.find((item) => item.status === 'upcoming')?.id;
  const currentIndex = todaysItems.findIndex((item) => item.id === currentOrNextId);
  const lastWindowStart = Math.max(0, todaysItems.length - MAX_ITEMS);
  const windowStart = currentIndex === -1 ? lastWindowStart : Math.min(currentIndex, lastWindowStart);
  const visibleItems = todaysItems.slice(windowStart, windowStart + MAX_ITEMS);

  return (
    <WidgetContainer
      title={<span className="text-xl font-semibold">{t('upcomingWorkTitle')}</span>}
      className="rounded-(--r-card) border-border-default shadow-sm"
      actions={
        todaysItems.length > MAX_ITEMS ? (
          <Button asChild variant="ghost" size="sm">
            <Link href="/doctor/appointments">{t('upcomingWorkViewAll', { count: todaysItems.length })}</Link>
          </Button>
        ) : undefined
      }
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
          {visibleItems.map((item) => (
            <li key={item.id}>
              <TimelineCard
                time={format.dateTime(new Date(item.scheduledAt), { hour: 'numeric', minute: 'numeric' })}
                title={item.title}
                description={item.description}
                status={item.status}
                statusLabel={<StatusLabel status={item.status} />}
                className="rounded-xl p-3 -mx-3 transition-colors duration-(--duration-fast) hover:bg-secondary-subtle"
                // Two lines beside it (name + badge, reason): md.
                leading={<PersonAvatar name={item.title} src={item.avatarUrl} size="md" />}
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
        // One quiet line: the greeting's day strip is the Overview's one illustrated empty state.
        <p className="text-sm text-text-secondary">{t('upcomingWorkEmptyLine')}</p>
      )}
    </WidgetContainer>
  );
}
