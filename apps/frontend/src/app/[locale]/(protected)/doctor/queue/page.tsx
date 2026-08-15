'use client';

import { CheckCircle2, Clock, Settings, ShieldCheck, UserCheck, Video } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useMemo, useState } from 'react';
import { AppBreadcrumbs } from '@/features/shell/components/breadcrumbs';
import { ConsultationWorkspaceAction } from '@/features/consultation/components/consultation-workspace-action';
import { StartConsultationAction } from '@/features/consultation/components/start-consultation-action';
import { PendingApprovalSection } from '@/features/doctor/components/queue/pending-approval-section';
import { useDoctorQueue } from '@/features/doctor/hooks/use-doctor-queue';
import { usePendingApprovalAppointments } from '@/features/doctor/hooks/use-pending-approval-appointments';
import { RefundQueueAction } from '@/features/payment/components/refund-queue-action';
import { JoinCallAction } from '@/features/telemedicine/components/join-call-action';
import { RequireRole } from '@/shared/auth/require-role';
import { Icon } from '@/shared/icons/icon';
import { Link } from '@/shared/i18n/navigation';
import { Alert } from '@/shared/ui/alert';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';
import { Card } from '@/shared/ui/card';
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
 * (waiting_room/in_progress/closed). The stats row's four counts are all
 * derived from that same response plus the real pending-approval list --
 * never a fabricated figure. "Queue settings" links to /doctor/schedule
 * (working hours + booking rules) since no dedicated queue-settings page
 * exists -- the closest real destination, not a placeholder.
 */
export default function DoctorQueuePage() {
  const t = useTranslations('doctor.queue');
  const tStatus = useTranslations('doctor.queue.status');
  const { data: queue, isLoading, isError } = useDoctorQueue();
  const { data: pending } = usePendingApprovalAppointments();
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

  const pendingCount = pending?.length ?? 0;
  const waitingCount = (queue ?? []).filter((entry) => entry.status === 'waiting').length;
  const inConsultationCount = (queue ?? []).filter((entry) => entry.status === 'in-consultation').length;
  const completedTodayCount = (queue ?? []).filter((entry) => entry.status === 'completed').length;

  const stats = [
    {
      icon: Clock,
      iconClassName: 'bg-primary-subtle text-primary-emphasis',
      value: pendingCount,
      label: t('stats.pendingApproval.title'),
      sublabel: pendingCount === 0 ? t('stats.pendingApproval.emptySublabel') : t('stats.pendingApproval.sublabel'),
    },
    {
      icon: Clock,
      iconClassName: 'bg-warning-subtle text-warning-emphasis',
      value: waitingCount,
      label: t('stats.waiting.title'),
      sublabel: t('stats.waiting.sublabel'),
    },
    {
      icon: Video,
      iconClassName: 'bg-danger-subtle text-danger-emphasis',
      value: inConsultationCount,
      label: t('stats.inConsultation.title'),
      sublabel: t('stats.inConsultation.sublabel'),
    },
    {
      icon: CheckCircle2,
      iconClassName: 'bg-success-subtle text-success-emphasis',
      value: completedTodayCount,
      label: t('stats.completedToday.title'),
      sublabel: t('stats.completedToday.sublabel'),
    },
  ];

  return (
    <RequireRole roles={['doctor']} redirectTo="/forbidden">
      <Page>
        <WorkspaceHeader
          breadcrumbs={<AppBreadcrumbs />}
          title={t('title')}
          description={t('description')}
          actions={
            <Button asChild variant="outline">
              <Link href="/doctor/schedule">
                <Icon icon={Settings} size="sm" />
                {t('queueSettings')}
              </Link>
            </Button>
          }
        />

        <PendingApprovalSection />

        {isError && <Alert variant="danger">{t('loadError')}</Alert>}

        {isLoading ? (
          <div className="flex flex-col gap-3">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-48 w-full" />
          </div>
        ) : (
          <>
            <Card className="p-6">
              <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
                {stats.map((stat) => (
                  <div key={stat.label} className="flex items-center gap-3">
                    <span className={`flex size-11 shrink-0 items-center justify-center rounded-full ${stat.iconClassName}`}>
                      <Icon icon={stat.icon} size="md" />
                    </span>
                    <div className="flex flex-col">
                      <span className="text-2xl font-bold text-text-primary">{stat.value}</span>
                      <span className="text-sm font-medium text-text-primary">{stat.label}</span>
                      <span className="text-xs text-text-tertiary">{stat.sublabel}</span>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            <DashboardGrid columns={2}>
              <div className="flex flex-col gap-3">
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
                        actions={
                          <div className="flex flex-wrap items-center gap-2">
                            <JoinCallAction consultationSessionId={currentPatient.id} />
                            <ConsultationWorkspaceAction consultationSessionId={currentPatient.id} />
                          </div>
                        }
                      />
                    ) : (
                      <div className="flex flex-col items-center gap-4 py-6 text-center">
                        <div className="relative flex size-28 items-center justify-center rounded-full bg-primary-subtle">
                          <div className="absolute inset-2 rounded-full bg-primary/10" />
                          <Icon icon={UserCheck} size="lg" className="relative text-primary" />
                          <span className="absolute -bottom-1 -end-1 flex size-9 items-center justify-center rounded-full bg-primary text-primary-foreground ring-2 ring-surface">
                            <Icon icon={Video} size="sm" />
                          </span>
                        </div>
                        <div className="flex flex-col gap-1">
                          <p className="font-semibold text-text-primary">{t('noCurrentPatientTitle')}</p>
                          <p className="max-w-xs text-sm text-text-secondary">{t('noCurrentPatientDescription')}</p>
                        </div>
                      </div>
                    )
                  }
                />
                <div className="flex items-start gap-3 rounded-lg bg-primary-subtle p-4">
                  <Icon icon={ShieldCheck} size="sm" className="mt-0.5 shrink-0 text-primary" />
                  <div className="flex flex-col gap-0.5">
                    <p className="text-sm font-medium text-text-primary">{t('confidentialBanner.title')}</p>
                    <p className="text-sm text-text-secondary">{t('confidentialBanner.description')}</p>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <QueueFilters value={filter} onChange={setFilter} options={filterOptions} />
                <WaitingQueue
                  title={
                    <span className="flex items-center gap-2">
                      {t('waitingQueueTitle')}
                      <Badge variant="primary">{waitingEntries.length}</Badge>
                    </span>
                  }
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
                        actions={
                          entry.status === 'waiting' ? (
                            <StartConsultationAction consultationSessionId={entry.id} />
                          ) : entry.status === 'completed' ? (
                            <RefundQueueAction consultationSessionId={entry.id} />
                          ) : undefined
                        }
                      />
                    </li>
                  ))}
                />
              </div>
            </DashboardGrid>
          </>
        )}
      </Page>
    </RequireRole>
  );
}
