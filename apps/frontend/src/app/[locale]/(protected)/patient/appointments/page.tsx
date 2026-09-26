'use client';

import { useTranslations } from 'next-intl';
import { useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { AppBreadcrumbs } from '@/features/shell/components/breadcrumbs';
import { AppointmentList } from '@/features/patient/components/appointments/appointment-list';
import { AppointmentsCalendar } from '@/features/patient/components/appointments/appointments-calendar';
import type { Appointment } from '@/features/patient/api/types';
import { usePatientAppointments } from '@/features/patient/hooks/use-patient-appointments';
import { selectPastAppointments, selectUpcomingAppointments } from '@/features/patient/lib/upcoming-appointments';
import { getCairoNow } from '@/shared/lib/date/timezone';
import { isSameDay } from '@/shared/lib/date/week';
import { ErrorState } from '@/shared/ui/error-state';
import { SkeletonRow } from '@/shared/ui/skeletons';
import { Link, usePathname, useRouter } from '@/shared/i18n/navigation';
import { RequireRole } from '@/shared/auth/require-role';
import { Button } from '@/shared/ui/button';
import { FilterTabs } from '@/shared/ui/filter-tabs';
import { Page } from '@/shared/ui/layout/page';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/tabs';
import { WorkspaceHeader } from '@/shared/ui/layout/workspace-header';

type HistoryFilter = 'all' | 'completed' | 'cancelled';

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
  const tUi = useTranslations('patientAppointmentsUi');
  const { data: appointments, isLoading, isError, refetch } = usePatientAppointments();
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [historyFilter, setHistoryFilter] = useState<HistoryFilter>('all');
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const consultationParam = searchParams.get('consultationSessionId') ?? undefined;
  const highlightId = searchParams.get('highlight') ?? undefined;
  // A notification link to THIS page (e.g. clicked from the bell while already
  // here) changes only the query string -- the page doesn't remount, so the
  // params must be reacted to, not read once. The consultation param is handed
  // to `autoOpenConsultationSessionId` and then consumed from the URL so the
  // same notification can be clicked again later.
  const [autoOpenConsultationSessionId, setAutoOpenConsultationSessionId] = useState<string | undefined>(consultationParam);

  // The one shared definition (features/patient/lib/upcoming-appointments.ts) --
  // the Overview hero, summary strip and list use the same selector.
  const onSelectedDay = (list: Appointment[]) =>
    selectedDay ? list.filter((a) => isSameDay(getCairoNow(new Date(a.scheduledAt)), getCairoNow(selectedDay))) : list;
  const upcoming = useMemo(
    () => onSelectedDay(selectUpcomingAppointments(appointments ?? [], getCairoNow())),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [appointments, selectedDay],
  );
  const history = useMemo(() => {
    const past = selectPastAppointments(appointments ?? [], getCairoNow());
    return onSelectedDay(historyFilter === 'all' ? past : past.filter((a) => a.status === historyFilter));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appointments, historyFilter, selectedDay]);

  // A highlighted appointment lives in whichever tab holds it; open that tab.
  const highlightedIsUpcoming = highlightId ? upcoming.some((a) => a.id === highlightId) : false;
  const [activeTab, setActiveTab] = useState<'upcoming' | 'history'>(consultationParam ? 'history' : 'upcoming');

  useEffect(() => {
    if (consultationParam) {
      setAutoOpenConsultationSessionId(consultationParam);
      setActiveTab('history');
      router.replace(pathname, { scroll: false });
    } else {
      setAutoOpenConsultationSessionId(undefined);
    }
  }, [consultationParam, pathname, router]);

  useEffect(() => {
    if (highlightId && !isLoading) setActiveTab(highlightedIsUpcoming ? 'upcoming' : 'history');
  }, [highlightId, highlightedIsUpcoming, isLoading]);

  useEffect(() => {
    if (!highlightId || isLoading) return;
    document.getElementById(`appointment-${highlightId}`)?.scrollIntoView?.({ block: 'center' });
  }, [highlightId, isLoading, appointments]);

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

        {isError && <ErrorState size="sm" description={t('loadError')} onRetry={() => void refetch()} />}

        <AppointmentsCalendar appointments={appointments ?? []} selectedDay={selectedDay} onSelectDay={setSelectedDay} />
        {selectedDay && (
          <Button type="button" variant="secondary" size="sm" className="self-start" onClick={() => setSelectedDay(null)}>
            {tUi('clearDay')}
          </Button>
        )}

        {isLoading ? (
          <div className="flex flex-col gap-3" aria-busy="true" aria-live="polite">
            <SkeletonRow />
            <SkeletonRow />
          </div>
        ) : (
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'upcoming' | 'history')}>
            <TabsList>
              <TabsTrigger value="upcoming">{t('upcomingTab')}</TabsTrigger>
              <TabsTrigger value="history">{t('historyTab')}</TabsTrigger>
            </TabsList>

            <TabsContent value="upcoming">
              <AppointmentList
                appointments={upcoming}
                highlightId={highlightId}
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
                  highlightId={highlightId}
                />
              </div>
            </TabsContent>
          </Tabs>
        )}
      </Page>
    </RequireRole>
  );
}
