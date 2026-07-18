'use client';

import { useFormatter, useTranslations } from 'next-intl';
import { useDoctorUpcomingWork } from '@/features/doctor/hooks/use-doctor-upcoming-work';
import type { UpcomingWorkItem } from '@/features/doctor/api/types';
import { Alert } from '@/shared/ui/alert';
import { EmptyState } from '@/shared/ui/empty-state';
import { Skeleton } from '@/shared/ui/skeleton';
import { TimelineCard } from '@/shared/ui/layout/timeline-card';
import { WidgetContainer } from '@/shared/ui/layout/widget-container';

function StatusLabel({ status }: { status: UpcomingWorkItem['status'] }) {
  const t = useTranslations('doctor.dashboard.upcomingWork.status');
  return <>{t(status)}</>;
}

/** The Doctor Workspace's "Upcoming Work Area" — real (mocked) upcoming-work entries rendered as `TimelineCard`s, with a built-in loading/empty state. Empty today since no Appointment/Consultation module exists yet to produce real entries — an honest empty state, not a fabricated schedule. */
export function UpcomingWorkArea() {
  const t = useTranslations('doctor.dashboard');
  const format = useFormatter();
  const { data: items, isLoading, isError } = useDoctorUpcomingWork();

  return (
    <WidgetContainer title={t('upcomingWorkTitle')}>
      {isError ? (
        <Alert variant="danger">{t('upcomingWorkLoadError')}</Alert>
      ) : isLoading ? (
        <div className="flex flex-col gap-3" aria-busy="true" aria-live="polite">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      ) : items && items.length > 0 ? (
        <ul className="flex flex-col gap-4">
          {items.map((item) => (
            <li key={item.id}>
              <TimelineCard
                time={format.dateTime(new Date(item.scheduledAt), { hour: 'numeric', minute: 'numeric' })}
                title={item.title}
                description={item.description}
                status={item.status}
                statusLabel={<StatusLabel status={item.status} />}
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
