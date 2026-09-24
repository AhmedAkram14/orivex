'use client';

import { useFormatter, useLocale, useTranslations } from 'next-intl';
import { usePatientAppointments } from '@/features/patient/hooks/use-patient-appointments';
import { selectUpcomingAppointments } from '@/features/patient/lib/upcoming-appointments';
import { getCairoNow } from '@/shared/lib/date/timezone';
import { pickLocalizedName } from '@/shared/i18n/localized-name';
import { Alert } from '@/shared/ui/alert';
import { AppointmentCard } from '@/shared/ui/appointments/appointment-card';
import { Button } from '@/shared/ui/button';
import { EmptyState } from '@/shared/ui/empty-state';
import { Link } from '@/shared/i18n/navigation';
import { Skeleton } from '@/shared/ui/skeleton';
import { WidgetContainer } from '@/shared/ui/layout/widget-container';

const MAX_ITEMS = 5;

/**
 * The redesigned "My Health" dashboard's "Upcoming appointments" widget —
 * real `GET /appointments/me` data (the same source `/patient/appointments`
 * itself renders), the soonest few only, with a "View all appointments"
 * link to the full page rather than duplicating its calendar/tabs
 * architecture here.
 */
export function UpcomingAppointmentsWidget() {
  const t = useTranslations('patient.dashboard');
  const tStatus = useTranslations('patient.appointments.status');
  const tConsultationType = useTranslations('patient.appointments.consultationType');
  const format = useFormatter();
  const locale = useLocale();
  const { data: appointments, isLoading, isError, refetch } = usePatientAppointments();

  // The one shared "upcoming" definition, identical to the hero, the summary
  // strip and the Appointments page's Upcoming tab.
  const upcoming = selectUpcomingAppointments(appointments ?? [], getCairoNow()).slice(0, MAX_ITEMS);

  return (
    <WidgetContainer
      title={<span className="text-lg font-semibold">{t('upcomingAppointmentsTitle')}</span>}
      titleAs="h2"
      className="rounded-3xl border-border-default shadow-[0_10px_30px_rgba(15,23,42,0.06)]"
      actions={
        <Button asChild variant="ghost" size="sm">
          <Link href="/patient/appointments">{t('viewAllAppointments')}</Link>
        </Button>
      }
    >
      {isError ? (
        <Alert variant="danger">
          <span>{t('upcomingAppointmentsLoadError')}</span>{' '}
          <button type="button" className="font-medium underline" onClick={() => refetch()}>
            {t('retry')}
          </button>
        </Alert>
      ) : isLoading ? (
        <div className="flex flex-col gap-3" aria-busy="true" aria-live="polite">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      ) : upcoming.length > 0 ? (
        <ul className="flex flex-col gap-3">
          {upcoming.map((appointment) => (
            <li key={appointment.id}>
              {/* The whole row is one link (keyboard-focusable) to that appointment's row on the Appointments page. */}
              <Link
                href={`/patient/appointments?highlight=${appointment.id}`}
                className="block rounded-lg transition-colors hover:bg-secondary-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
              >
              <AppointmentCard
                scheduledAtLabel={format.dateTime(new Date(appointment.scheduledAt), {
                  month: 'short',
                  day: 'numeric',
                  hour: 'numeric',
                  minute: 'numeric',
                })}
                counterpartyName={appointment.doctorName}
                counterpartyDetail={pickLocalizedName(appointment.specialization, appointment.specializationAr, locale)}
                status={appointment.status}
                statusLabel={tStatus(appointment.status)}
                consultationTypeLabel={tConsultationType(appointment.consultationType)}
              />
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState
          className="py-6"
          title={t('upcomingAppointmentsEmptyTitle')}
          description={t('upcomingAppointmentsEmptyDescription')}
        />
      )}
    </WidgetContainer>
  );
}
