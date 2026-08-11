'use client';

import { useTranslations } from 'next-intl';
import { useSearchParams } from 'next/navigation';
import { useMemo, useState } from 'react';
import { AppBreadcrumbs } from '@/features/shell/components/breadcrumbs';
import { AppointmentList } from '@/features/patient/components/appointments/appointment-list';
import { AppointmentsCalendar } from '@/features/patient/components/appointments/appointments-calendar';
import { usePatientAppointments } from '@/features/patient/hooks/use-patient-appointments';
import { Link } from '@/shared/i18n/navigation';
import { RequireRole } from '@/shared/auth/require-role';
import { Alert } from '@/shared/ui/alert';
import { Button } from '@/shared/ui/button';
import { FilterTabs } from '@/shared/ui/filter-tabs';
import { Skeleton } from '@/shared/ui/skeleton';
import { Page } from '@/shared/ui/layout/page';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/tabs';
import { WorkspaceHeader } from '@/shared/ui/layout/workspace-header';

type HistoryFilter = 'all' | 'completed' | 'cancelled';

// Matches ConsultationModule's real AppointmentStatus enum: an appointment
// is still "upcoming" while requested/confirmed/rescheduled, and moves to
// history once it reaches a terminal state (completed/cancelled/no_show).
const UPCOMING_STATUSES = ['requested', 'confirmed', 'rescheduled'];

/**
 * The Patient Portal's Appointments page — a calendar foundation (real week
 * grid, marking days with appointments), then Upcoming/History tabs, each
 * rendering real `Appointment` data (GET /appointments/me) via the reusable
 * `AppointmentList`/`AppointmentCard`. A "Consultation completed"
 * notification deep-links here with `?consultationSessionId=` -- the page
 * opens straight on the History tab (a completed appointment always lives
 * there) with that specific consultation's summary dialog already open,
 * rather than making the patient hunt for it.
 */
export default function PatientAppointmentsPage() {
  const t = useTranslations('patient.appointments');
  const { data: appointments, isLoading, isError } = usePatientAppointments();
  const [historyFilter, setHistoryFilter] = useState<HistoryFilter>('all');
  const searchParams = useSearchParams();
  const autoOpenConsultationSessionId = searchParams.get('consultationSessionId') ?? undefined;

  const upcoming = useMemo(
    () => (appointments ?? []).filter((a) => UPCOMING_STATUSES.includes(a.status)),
    [appointments],
  );
  const history = useMemo(() => {
    const past = (appointments ?? []).filter((a) => !UPCOMING_STATUSES.includes(a.status));
    return historyFilter === 'all' ? past : past.filter((a) => a.status === historyFilter);
  }, [appointments, historyFilter]);

  return (
    <RequireRole roles={['patient']} redirectTo="/forbidden">
      <Page>
        <WorkspaceHeader
          breadcrumbs={<AppBreadcrumbs />}
          title={t('title')}
          actions={
            <Button asChild>
              <Link href="/patient/appointments/book">{t('bookAppointment')}</Link>
            </Button>
          }
        />

        {isError && <Alert variant="danger">{t('loadError')}</Alert>}

        <AppointmentsCalendar appointments={appointments ?? []} />

        {isLoading ? (
          <div className="flex flex-col gap-3" aria-busy="true" aria-live="polite">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        ) : (
          <Tabs defaultValue={autoOpenConsultationSessionId ? 'history' : 'upcoming'}>
            <TabsList>
              <TabsTrigger value="upcoming">{t('upcomingTab')}</TabsTrigger>
              <TabsTrigger value="history">{t('historyTab')}</TabsTrigger>
            </TabsList>

            <TabsContent value="upcoming">
              <AppointmentList
                appointments={upcoming}
                emptyTitle={t('upcomingEmptyTitle')}
                emptyDescription={t('upcomingEmptyDescription')}
              />
            </TabsContent>

            <TabsContent value="history">
              <div className="flex flex-col gap-4">
                <FilterTabs
                  value={historyFilter}
                  onChange={setHistoryFilter}
                  options={[
                    { value: 'all', label: t('filters.all') },
                    { value: 'completed', label: t('filters.completed') },
                    { value: 'cancelled', label: t('filters.cancelled') },
                  ]}
                />
                <AppointmentList
                  appointments={history}
                  emptyTitle={t('historyEmptyTitle')}
                  emptyDescription={t('historyEmptyDescription')}
                  autoOpenConsultationSessionId={autoOpenConsultationSessionId}
                />
              </div>
            </TabsContent>
          </Tabs>
        )}
      </Page>
    </RequireRole>
  );
}
