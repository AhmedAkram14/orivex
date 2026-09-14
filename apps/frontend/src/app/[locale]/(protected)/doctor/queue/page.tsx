'use client';

import { CheckCircle2, Clock, Settings, ShieldCheck, UserCheck, Video } from 'lucide-react';
import { useFormatter, useTranslations } from 'next-intl';
import { useSearchParams } from 'next/navigation';
import { useMemo, useState } from 'react';
import { AppBreadcrumbs } from '@/features/shell/components/breadcrumbs';
import { ConsultationWorkspaceAction } from '@/features/consultation/components/consultation-workspace-action';
import { StartConsultationAction } from '@/features/consultation/components/start-consultation-action';
import { PendingApprovalSection } from '@/features/doctor/components/queue/pending-approval-section';
import type { QueueEntry } from '@/features/doctor/api/types';
import { useDoctorQueue } from '@/features/doctor/hooks/use-doctor-queue';
import { usePendingApprovalAppointments } from '@/features/doctor/hooks/use-pending-approval-appointments';
import { useQueueArrivalAnnouncer } from '@/features/doctor/hooks/use-queue-arrival-announcer';
import { RefundQueueAction } from '@/features/payment/components/refund-queue-action';
import { JoinCallAction } from '@/features/telemedicine/components/join-call-action';
import { RequireRole } from '@/shared/auth/require-role';
import { Icon } from '@/shared/icons/icon';
import { Link, usePathname, useRouter } from '@/shared/i18n/navigation';
import { canJoinCall } from '@/shared/lib/consultation/join-window';
import { Alert } from '@/shared/ui/alert';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';
import { Card } from '@/shared/ui/card';
import { JoinCountdown } from '@/shared/ui/consultation/join-countdown';
import { Skeleton } from '@/shared/ui/skeleton';
import { CurrentPatientCard } from '@/shared/ui/queue/current-patient-card';
import { PatientQueueCard } from '@/shared/ui/queue/patient-queue-card';
import type { QueueStatusValue } from '@/shared/ui/queue/queue-status';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/tabs';
import { WaitingQueue } from '@/shared/ui/queue/waiting-queue';
import { DashboardGrid, Page } from '@/shared/ui/layout/page';
import { WorkspaceHeader } from '@/shared/ui/layout/workspace-header';

// "In Consultation" used to be a fourth filter option here, but the waiting
// list unconditionally excludes in-consultation entries (they're the
// Current Patient card's own job, to the left) -- so that tab could never
// show anything but 0 regardless of what was actually happening, the exact
// "which one is authoritative" confusion this page's own audit called out.
// Three real, always-meaningful filters instead.
type QueueTabValue = 'all' | 'waiting' | 'completed';
const TAB_VALUES: readonly QueueTabValue[] = ['all', 'waiting', 'completed'];

/**
 * The Doctor Workspace's Patient Queue — reusable queue architecture
 * (current patient slot, status filters, waiting list) backed by the real
 * `GET /appointments/doctor/queue` endpoint (ConsultationModule's
 * AppointmentController), composing today's Confirmed/Completed
 * appointments with their real ConsultationSession state
 * (waiting_room/in_progress/closed). The stats row's four counts are all
 * derived from that same response plus the real pending-approval list --
 * never a fabricated figure. "Manage Schedule" links to /doctor/schedule
 * (working hours + booking rules) and is named for what it actually opens,
 * not a "Queue settings" destination that doesn't exist.
 */
export default function DoctorQueuePage() {
  const t = useTranslations('doctor.queue');
  const tStatus = useTranslations('doctor.queue.status');
  const format = useFormatter();
  const { data: queue, isLoading, isError, dataUpdatedAt } = useDoctorQueue();
  const { data: pending } = usePendingApprovalAppointments();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const tabParam = searchParams.get('tab');
  const initialTab: QueueTabValue = TAB_VALUES.includes(tabParam as QueueTabValue) ? (tabParam as QueueTabValue) : 'all';
  const [filter, setFilter] = useState<QueueTabValue>(initialTab);

  // Shareable/restorable tab state (?tab=waiting), not just component state
  // that resets to "All" on every reload or shared link.
  function handleFilterChange(next: QueueTabValue) {
    setFilter(next);
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', next);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }

  const announcement = useQueueArrivalAnnouncer(queue, (name) => ({
    title: t('arrival.toastTitle'),
    description: t('arrival.toastDescription', { name }),
    announcement: t('arrival.announcement', { name }),
  }));

  const currentPatient = queue?.find((entry) => entry.status === 'in-consultation');
  const nonCurrentEntries = (queue ?? []).filter((entry) => entry.status !== 'in-consultation');

  const entriesByTab: Record<QueueTabValue, QueueEntry[]> = useMemo(
    () => ({
      all: nonCurrentEntries,
      waiting: nonCurrentEntries.filter((entry) => entry.status === 'waiting'),
      completed: nonCurrentEntries.filter((entry) => entry.status === 'completed'),
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [queue],
  );

  const tabTitles: Record<QueueTabValue, string> = {
    all: t('waitingQueueTitle'),
    waiting: tStatus('waiting'),
    completed: tStatus('completed'),
  };

  const pendingCount = pending?.length ?? 0;
  const waitingCount = entriesByTab.waiting.length;
  const inConsultationCount = currentPatient ? 1 : 0;
  const completedTodayCount = entriesByTab.completed.length;

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
      iconClassName: 'bg-info-subtle text-info-emphasis',
      value: waitingCount,
      label: t('stats.waiting.title'),
      sublabel: t('stats.waiting.sublabel'),
    },
    {
      icon: Video,
      // Amber, matching QueueStatus's own 'warning' mapping for this exact
      // status everywhere else on the page (the per-entry badge) -- not
      // red/danger, which reads as an error state when a consultation
      // actively in progress is the healthiest thing this page can show.
      iconClassName: 'bg-warning-subtle text-warning-emphasis',
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

  function renderQueuePanel(value: QueueTabValue) {
    const entries = entriesByTab[value];
    return (
      <WaitingQueue
        // A visible ": " between the title and the count badge, not just a
        // flex gap -- the accessibility tree concatenates adjacent inline
        // text with no natural word boundary ("Waiting queue" + "4" reads
        // as "Waiting queue4" to a screen reader), so this is a real
        // separator character, not only a CSS gap.
        title={
          <span className="flex items-center gap-1.5">
            {tabTitles[value]}
            {': '}
            <Badge variant="primary">{entries.length}</Badge>
          </span>
        }
        emptyTitle={t('emptyTitle')}
        emptyDescription={t('emptyDescription')}
        isEmpty={entries.length === 0}
        items={entries.map((entry) => (
          <li key={entry.id}>
            <PatientQueueCard
              position={entry.position}
              label={entry.label}
              status={entry.status as QueueStatusValue}
              statusLabel={tStatus(entry.status)}
              waitTimeLabel={
                entry.estimatedWaitMinutes !== undefined ? t('waitMinutes', { minutes: entry.estimatedWaitMinutes }) : undefined
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
    );
  }

  return (
    <RequireRole roles={['doctor']} redirectTo="/forbidden">
      <Page>
        {/* This page's whole reason to stay open is watching for a new
            arrival -- announced here for a screen-reader user the instant
            it happens, since nothing else on the page (no sound, no toast)
            reaches them. Visually hidden; the toast + chime carry the same
            news for a sighted user. */}
        <div role="status" aria-live="polite" className="sr-only">
          {announcement}
        </div>

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
                            {canJoinCall(currentPatient.scheduledAt) ? (
                              <JoinCallAction consultationSessionId={currentPatient.id} />
                            ) : (
                              <JoinCountdown scheduledAt={currentPatient.scheduledAt} label={t('joinCountdownLabel')} />
                            )}
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
              </div>

              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between gap-2">
                  <Tabs value={filter} onValueChange={(value) => handleFilterChange(value as QueueTabValue)}>
                    <TabsList>
                      <TabsTrigger value="all">{t('filters.all')}</TabsTrigger>
                      <TabsTrigger value="waiting">{tStatus('waiting')}</TabsTrigger>
                      <TabsTrigger value="completed">{tStatus('completed')}</TabsTrigger>
                    </TabsList>
                    {/* A real `role="tabpanel"` for the active tab, with
                        an id `TabsTrigger` actually resolves via
                        `aria-controls` -- there was no TabsContent
                        anywhere on this page before, so every trigger's
                        `aria-controls` pointed at an id that existed
                        nowhere in the DOM. */}
                    <TabsContent value={filter}>{renderQueuePanel(filter)}</TabsContent>
                  </Tabs>
                </div>
                {dataUpdatedAt > 0 && (
                  <p className="text-end text-xs text-text-tertiary">
                    {t('lastUpdated', { time: format.dateTime(new Date(dataUpdatedAt), { timeStyle: 'short' }) })}
                  </p>
                )}
                <div className="flex items-start gap-3 rounded-lg bg-primary-subtle p-4">
                  <Icon icon={ShieldCheck} size="sm" className="mt-0.5 shrink-0 text-primary" />
                  <div className="flex flex-col gap-0.5">
                    <p className="text-sm font-medium text-text-primary">{t('confidentialBanner.title')}</p>
                    <p className="text-sm text-text-secondary">{t('confidentialBanner.description')}</p>
                  </div>
                </div>
              </div>
            </DashboardGrid>
          </>
        )}
      </Page>
    </RequireRole>
  );
}
