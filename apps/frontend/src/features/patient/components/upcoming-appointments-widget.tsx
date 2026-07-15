'use client';

import { useFormatter, useTranslations } from 'next-intl';
import { usePatientUpcomingAppointments } from '@/features/patient/hooks/use-patient-upcoming-appointments';
import type { UpcomingAppointmentPreview } from '@/features/patient/api/types';
import { EmptyState } from '@/shared/ui/empty-state';
import { Skeleton } from '@/shared/ui/skeleton';
import { TimelineCard } from '@/shared/ui/layout/timeline-card';
import { WidgetContainer } from '@/shared/ui/layout/widget-container';

function StatusLabel({ status }: { status: UpcomingAppointmentPreview['status'] }) {
  const t = useTranslations('patient.dashboard.upcomingAppointments.status');
  return <>{t(status)}</>;
}

/** The Patient Portal's "Upcoming Appointments" widget — real (mocked) upcoming appointments rendered as `TimelineCard`s, with a built-in loading/empty state. Empty today since no Scheduling module is wired into the frontend yet — an honest empty state, not a fabricated schedule. Mirrors the Doctor Workspace's `UpcomingWorkArea`. */
export function UpcomingAppointmentsWidget() {
  const t = useTranslations('patient.dashboard');
  const format = useFormatter();
  const { data: items, isLoading } = usePatientUpcomingAppointments();

  return (
    <WidgetContainer title={t('upcomingAppointmentsTitle')}>
      {isLoading ? (
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
                title={`${item.doctorName} — ${item.specialization}`}
                status={item.status}
                statusLabel={<StatusLabel status={item.status} />}
              />
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState
          title={t('upcomingAppointmentsEmptyTitle')}
          description={t('upcomingAppointmentsEmptyDescription')}
        />
      )}
    </WidgetContainer>
  );
}
