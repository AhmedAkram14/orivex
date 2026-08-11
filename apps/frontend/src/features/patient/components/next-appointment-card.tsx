'use client';

import { CalendarClock, Video } from 'lucide-react';
import Image from 'next/image';
import { useFormatter, useLocale, useTranslations } from 'next-intl';
import { ConsultationOutcomeAction } from '@/features/consultation/components/consultation-outcome-action';
import { PayNowAction } from '@/features/payment/components/pay-now-action';
import { usePatientAppointments } from '@/features/patient/hooks/use-patient-appointments';
import type { Appointment, AppointmentStatus } from '@/features/patient/api/types';
import { JoinCallAction } from '@/features/telemedicine/components/join-call-action';
import { pickLocalizedName } from '@/shared/i18n/localized-name';
import { isSameDay } from '@/shared/lib/date/week';
import { Alert } from '@/shared/ui/alert';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';
import { Card, CardContent } from '@/shared/ui/card';
import { EmptyState } from '@/shared/ui/empty-state';
import { Icon } from '@/shared/icons/icon';
import { Link } from '@/shared/i18n/navigation';
import { Skeleton } from '@/shared/ui/skeleton';

// Matches PatientAppointmentsPage's own UPCOMING_STATUSES exactly -- an
// appointment is still "next" while requested/confirmed/rescheduled.
const UPCOMING_STATUSES: AppointmentStatus[] = ['requested', 'confirmed', 'rescheduled'];

function nextAppointmentOf(appointments: Appointment[]): Appointment | undefined {
  return [...appointments]
    .filter((appointment) => UPCOMING_STATUSES.includes(appointment.status))
    .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime())[0];
}

/**
 * The redesigned "My Health" dashboard's primary focal point — the
 * patient's single next appointment (real `GET /appointments/me` data, the
 * same source `/patient/appointments` itself renders), not a generic list.
 * Reuses the exact same action logic `AppointmentList` already has (Pay
 * now / Join call / view outcome), since a "next appointment" is just the
 * earliest upcoming entry from that same real appointment set — never a
 * fabricated preview shape. A "View appointment" link is always shown
 * alongside whichever real action applies, so there's always a way to see
 * the full appointment even when no primary action is available yet (e.g.
 * still awaiting doctor approval).
 */
export function NextAppointmentCard() {
  const t = useTranslations('patient.dashboard');
  const locale = useLocale();
  const format = useFormatter();
  const { data: appointments, isLoading, isError } = usePatientAppointments();

  if (isError) {
    return (
      <Card className="h-full">
        <CardContent className="p-6">
          <Alert variant="danger">{t('nextAppointmentLoadError')}</Alert>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card className="h-full">
        <CardContent className="flex flex-col gap-3 p-6" aria-busy="true" aria-live="polite">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-10 w-40" />
        </CardContent>
      </Card>
    );
  }

  const next = nextAppointmentOf(appointments ?? []);

  if (!next) {
    return (
      <Card className="h-full">
        <CardContent className="flex h-full items-center p-6">
          <EmptyState
            className="w-full py-6"
            icon={CalendarClock}
            title={t('nextAppointmentEmptyTitle')}
            description={t('nextAppointmentEmptyDescription')}
            action={
              <Button asChild size="sm">
                <Link href="/patient/doctors">{t('browseDoctorsAction')}</Link>
              </Button>
            }
          />
        </CardContent>
      </Card>
    );
  }

  const now = new Date();
  const scheduledAt = new Date(next.scheduledAt);
  const dayLabel = isSameDay(scheduledAt, now)
    ? t('today')
    : isSameDay(scheduledAt, new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1))
      ? t('tomorrow')
      : format.dateTime(scheduledAt, { weekday: 'short', month: 'short', day: 'numeric' });
  const timeLabel = format.dateTime(scheduledAt, { hour: 'numeric', minute: 'numeric' });

  const primaryAction =
    next.paymentRequired && next.feeAmount ? (
      <PayNowAction appointmentId={next.id} amount={next.feeAmount} />
    ) : next.status === 'confirmed' && next.consultationSessionId ? (
      <JoinCallAction consultationSessionId={next.consultationSessionId} />
    ) : next.status === 'completed' && next.consultationSessionId ? (
      <ConsultationOutcomeAction consultationSessionId={next.consultationSessionId} />
    ) : null;

  return (
    <Card className="relative isolate h-full overflow-hidden border-transparent bg-primary-subtle">
      <div
        aria-hidden
        className="pointer-events-none absolute -end-8 top-1/2 size-44 -translate-y-1/2 opacity-90 [mix-blend-mode:screen] rtl:scale-x-[-1]"
      >
        <Image src="/calendar-profile.png" alt="" fill sizes="176px" className="object-contain" />
      </div>

      <CardContent className="relative z-10 flex h-full flex-col gap-4 p-6">
        <Badge variant="primary" className="w-fit gap-1.5 bg-surface px-3 py-1 text-xs uppercase tracking-wide">
          {t('nextAppointmentEyebrow')}
        </Badge>

        <div className="flex items-center gap-3">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <Icon icon={CalendarClock} size="md" />
          </div>
          <div className="flex flex-col gap-1">
            <p className="text-2xl font-semibold text-text-primary">
              {dayLabel} · {timeLabel}
            </p>
            <p className="text-base">
              <span className="font-medium text-primary">{next.doctorName}</span>
              <span className="text-primary"> · {pickLocalizedName(next.specialization, next.specializationAr, locale)}</span>
            </p>
          </div>
        </div>

        <span className="flex items-center gap-1.5 text-sm text-text-secondary">
          <Icon icon={Video} size="sm" />
          {t('videoConsultation')}
        </span>

        <div className="mt-auto flex flex-wrap items-center gap-2 pt-2">
          {primaryAction}
          <Button asChild variant="outline">
            <Link href="/patient/appointments">{t('viewAppointmentAction')}</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
