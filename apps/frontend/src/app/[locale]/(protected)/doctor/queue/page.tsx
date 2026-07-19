'use client';

import { useTranslations } from 'next-intl';
import { useMemo, useState } from 'react';
import { AppBreadcrumbs } from '@/features/shell/components/breadcrumbs';
import { useDoctorQueue } from '@/features/doctor/hooks/use-doctor-queue';
import { RefundQueueAction } from '@/features/payment/components/refund-queue-action';
import { JoinCallAction } from '@/features/telemedicine/components/join-call-action';
import { RequireRole } from '@/shared/auth/require-role';
import { Alert } from '@/shared/ui/alert';
import { Skeleton } from '@/shared/ui/skeleton';
import { CurrentPatientCard } from '@/shared/ui/queue/current-patient-card';
import { PatientQueueCard } from '@/shared/ui/queue/patient-queue-card';
import { QueueFilters, type QueueFilterValue } from '@/shared/ui/queue/queue-filters';
import type { QueueStatusValue } from '@/shared/ui/queue/queue-status';
import { WaitingQueue } from '@/shared/ui/queue/waiting-queue';
import { DashboardGrid, Page } from '@/shared/ui/layout/page';
import { WorkspaceHeader } from '@/shared/ui/layout/workspace-header';

/**
 * The Doctor Workspace's Patient Queue — reusable queue architecture
 * (current patient slot, status filters, waiting list) backed by the real
 * `GET /appointments/doctor/queue` endpoint (ConsultationModule's
 * AppointmentController), composing today's Confirmed/Completed
 * appointments with their real ConsultationSession state
 * (waiting_room/in_progress/closed).
 */
export default function DoctorQueuePage() {
  const t = useTranslations('doctor.queue');
  const tStatus = useTranslations('doctor.queue.status');
  const { data: queue, isLoading, isError } = useDoctorQueue();
  const [filter, setFilter] = useState<QueueFilterValue>('all');

  const filterOptions = useMemo(
    () => [
      { value: 'all' as const, label: t('filters.all') },
      { value: 'waiting' as const, label: tStatus('waiting') },
      { value: 'in-consultation' as const, label: tStatus('in-consultation') },
      { value: 'completed' as const, label: tStatus('completed') },
    ],
    [t, tStatus],
  );

  const currentPatient = queue?.find((entry) => entry.status === 'in-consultation');
  const waitingEntries = (queue ?? []).filter((entry) => {
    if (entry.status === 'in-consultation') return false;
    return filter === 'all' || entry.status === filter;
  });

  return (
    <RequireRole roles={['doctor']} redirectTo="/forbidden">
      <Page>
        <WorkspaceHeader breadcrumbs={<AppBreadcrumbs />} title={t('title')} />

        {isError && <Alert variant="danger">{t('loadError')}</Alert>}

        {isLoading ? (
          <div className="flex flex-col gap-3">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-48 w-full" />
          </div>
        ) : (
          <DashboardGrid columns={2}>
            <CurrentPatientCard
              title={t('currentPatientTitle')}
              emptyTitle={t('noCurrentPatientTitle')}
              emptyDescription={t('noCurrentPatientDescription')}
              content={
                currentPatient ? (
                  <PatientQueueCard
                    position={currentPatient.position}
                    label={currentPatient.label}
                    status={currentPatient.status}
                    statusLabel={tStatus(currentPatient.status)}
                    actions={<JoinCallAction consultationSessionId={currentPatient.id} />}
                  />
                ) : undefined
              }
            />
            <div className="flex flex-col gap-3">
              <QueueFilters value={filter} onChange={setFilter} options={filterOptions} />
              <WaitingQueue
                title={t('waitingQueueTitle')}
                emptyTitle={t('emptyTitle')}
                emptyDescription={t('emptyDescription')}
                isEmpty={waitingEntries.length === 0}
                items={waitingEntries.map((entry) => (
                  <li key={entry.id}>
                    <PatientQueueCard
                      position={entry.position}
                      label={entry.label}
                      status={entry.status as QueueStatusValue}
                      statusLabel={tStatus(entry.status)}
                      waitTimeLabel={
                        entry.estimatedWaitMinutes !== undefined
                          ? t('waitMinutes', { minutes: entry.estimatedWaitMinutes })
                          : undefined
                      }
                      actions={entry.status === 'completed' ? <RefundQueueAction consultationSessionId={entry.id} /> : undefined}
                    />
                  </li>
                ))}
              />
            </div>
          </DashboardGrid>
        )}
      </Page>
    </RequireRole>
  );
}
