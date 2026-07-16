'use client';

import { useTranslations } from 'next-intl';
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

/**
 * The Patient Portal's Appointments page — a calendar foundation (real week
 * grid, marking days with appointments), then Upcoming/History tabs, each
 * rendering real (mocked) `Appointment` data via the reusable
 * `AppointmentList`/`AppointmentCard`. Honestly empty today since no
 * Scheduling module is wired into the frontend yet.
 */
export default function PatientAppointmentsPage() {
  const t = useTranslations('patient.appointments');
  const { data: appointments, isLoading, isError } = usePatientAppointments();
  const [historyFilter, setHistoryFilter] = useState<HistoryFilter>('all');

  const upcoming = useMemo(() => (appointments ?? []).filter((a) => a.status === 'upcoming'), [appointments]);
  const history = useMemo(() => {
    const past = (appointments ?? []).filter((a) => a.status !== 'upcoming');
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
          <Tabs defaultValue="upcoming">
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
                />
              </div>
            </TabsContent>
          </Tabs>
        )}
      </Page>
    </RequireRole>
  );
}
