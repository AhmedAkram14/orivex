'use client';

import { CalendarClock, Video } from 'lucide-react';
import { useFormatter, useLocale, useTranslations } from 'next-intl';
import { ConsultationOutcomeAction } from '@/features/consultation/components/consultation-outcome-action';
import { PayNowAction } from '@/features/payment/components/pay-now-action';
import { usePatientAppointments } from '@/features/patient/hooks/use-patient-appointments';
import type { Appointment, AppointmentStatus } from '@/features/patient/api/types';
import { JoinCallAction } from '@/features/telemedicine/components/join-call-action';
import { pickLocalizedName } from '@/shared/i18n/localized-name';
import { isSameDay } from '@/shared/lib/date/week';
import { Alert } from '@/shared/ui/alert';
import { Avatar, AvatarFallback } from '@/shared/ui/avatar';
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

// Shared "premium hero card" language this dashboard borrows from the
// Doctor Workspace's own `DashboardHero`/`TodaysSchedule` redesign (same
// radius + soft elevated shadow), so the two workspaces read as one
// product rather than two differently-designed dashboards. This card is
// now its own full-width row (see patient/page.tsx's comment on why it's
// no longer paired side-by-side with `HealthSummary`), so no cross-axis
// alignment override is needed here.
const HERO_CARD_CLASSNAME = 'rounded-3xl border-transparent shadow-[0_10px_30px_rgba(15,23,42,0.06)]';

function nextAppointmentOf(appointments: Appointment[]): Appointment | undefined {
  return [...appointments]
    .filter((appointment) => UPCOMING_STATUSES.includes(appointment.status))
    .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime())[0];
}

function initialsFor(fullName: string): string {
  const parts = fullName.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? '';
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? '') : '';
  return (first + last).toUpperCase();
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
      <Card className={HERO_CARD_CLASSNAME}>
        <CardContent className="p-6">
          <Alert variant="danger">{t('nextAppointmentLoadError')}</Alert>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card className={HERO_CARD_CLASSNAME}>
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
      <Card className={HERO_CARD_CLASSNAME}>
        <CardContent className="p-6">
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
    <Card
      className={`relative isolate overflow-hidden bg-gradient-to-br from-primary-subtle to-surface ${HERO_CARD_CLASSNAME}`}
    >
      {/* Purely decorative depth -- two soft, blurred brand-colored blobs, never a literal icon/photo (that kept reading as a rendering artifact against this light a background). */}
      <div aria-hidden className="pointer-events-none absolute -end-16 -top-20 size-64 rounded-full bg-primary/10 blur-3xl" />
      <div aria-hidden className="pointer-events-none absolute -end-10 -bottom-24 size-56 rounded-full bg-primary/10 blur-3xl" />

      <CardContent className="relative z-10 flex flex-col gap-5 p-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Badge variant="primary" className="w-fit gap-1.5 bg-surface/90 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider shadow-sm">
            {t('nextAppointmentEyebrow')}
          </Badge>
          <div className="flex items-center gap-1.5 rounded-full bg-surface/70 px-3 py-1 text-xs font-medium text-text-secondary">
            <Icon icon={Video} size="xs" />
            {t('videoConsultation')}
          </div>
        </div>

        <p className="text-3xl leading-none font-bold tracking-tight text-text-primary">
          {dayLabel} <span className="text-primary">·</span> {timeLabel}
        </p>

        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3.5">
            <Avatar className="size-12 shrink-0 text-base ring-4 ring-surface/80">
              <AvatarFallback className="bg-primary text-primary-foreground">{initialsFor(next.doctorName)}</AvatarFallback>
            </Avatar>
            <div className="flex flex-col gap-0.5">
              <p className="text-base font-semibold text-text-primary">{next.doctorName}</p>
              <p className="text-sm text-text-secondary">
                {pickLocalizedName(next.specialization, next.specializationAr, locale)}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {primaryAction}
            <Button asChild variant="outline" size="sm" className="bg-surface/70">
              <Link href="/patient/appointments">{t('viewAppointmentAction')}</Link>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
