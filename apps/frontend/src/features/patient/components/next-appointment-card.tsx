'use client';

import { useFormatter, useLocale, useTranslations } from 'next-intl';
import { ConsultationOutcomeAction } from '@/features/consultation/components/consultation-outcome-action';
import { PayNowAction } from '@/features/payment/components/pay-now-action';
import { usePatientAppointments } from '@/features/patient/hooks/use-patient-appointments';
import { canJoinCall } from '@/features/patient/lib/appointment-time';
import { selectLastCompletedAppointment, selectUpcomingAppointments } from '@/features/patient/lib/upcoming-appointments';
import { JoinCallAction } from '@/features/telemedicine/components/join-call-action';
import { pickLocalizedName } from '@/shared/i18n/localized-name';
import { JoinCountdown } from '@/shared/ui/consultation/join-countdown';
import { isSameDay } from '@/shared/lib/date/week';
import { getCairoNow } from '@/shared/lib/date/timezone';
import { PersonAvatar } from '@/shared/ui/avatar';
import { DateBlock } from '@/shared/ui/date-block';
import { ErrorState } from '@/shared/ui/error-state';
import { StatusBadge } from '@/shared/ui/status-badge';
import { Button } from '@/shared/ui/button';
import { EmptyState } from '@/shared/ui/empty-state';
import { Link } from '@/shared/i18n/navigation';
import { Skeleton } from '@/shared/ui/skeleton';

/** The hero's inner "next step" panel: a quiet surface on the warm hero, never a second card with its own shadow. */
const PANEL_CLASSNAME = 'rounded-(--r-card) bg-surface/80 p-5';

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
  const { data: appointments, isLoading, isError, refetch } = usePatientAppointments();

  if (isError) {
    return (
      <div className={PANEL_CLASSNAME}>
        <ErrorState size="sm" description={t('nextAppointmentLoadError')} onRetry={() => void refetch()} />
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className={`${PANEL_CLASSNAME} flex flex-col gap-3`} aria-busy="true" aria-live="polite">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-10 w-40" />
      </div>
    );
  }

  const now = getCairoNow();
  // The single shared "upcoming" definition -- never a past appointment.
  const next = selectUpcomingAppointments(appointments ?? [], now)[0];

  if (!next) {
    const lastCompleted = selectLastCompletedAppointment(appointments ?? []);
    return (
      <div className={PANEL_CLASSNAME}>
          <EmptyState illustration="calendar-clear"
            className="w-full py-6"
            title={t('nextAppointmentEmptyTitle')}
            description={t('nextAppointmentEmptyDescription')}
            action={
              <div className="flex flex-wrap items-center justify-center gap-2">
                <Button asChild variant="accent" size="sm">
                  <Link href="/patient/doctors">{t('bookAppointmentAction')}</Link>
                </Button>
                {lastCompleted && (
                  <Button asChild size="sm" variant="secondary">
                    <Link href={`/patient/appointments/book?doctorId=${lastCompleted.doctorId}`}>
                      {t('bookAgainAction', { doctor: lastCompleted.doctorName })}
                    </Link>
                  </Button>
                )}
              </div>
            }
          />
      </div>
    );
  }

  const scheduledAt = new Date(next.scheduledAt);
  const scheduledAtCairo = getCairoNow(scheduledAt);
  const dayLabel = isSameDay(scheduledAtCairo, now)
    ? t('today')
    : isSameDay(scheduledAtCairo, new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1))
      ? t('tomorrow')
      : format.dateTime(scheduledAt, {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
          // Year only when it isn't the current one -- avoids ambiguity for far-off dates.
          ...(scheduledAtCairo.getFullYear() !== now.getFullYear() ? { year: 'numeric' as const } : {}),
        });
  const timeLabel = format.dateTime(scheduledAt, { hour: 'numeric', minute: 'numeric' });

  const primaryAction =
    next.paymentRequired && next.feeAmount ? (
      <PayNowAction appointmentId={next.id} amount={next.feeAmount} />
    ) : next.status === 'confirmed' && next.consultationSessionId && canJoinCall(next.scheduledAt) ? (
      <JoinCallAction consultationSessionId={next.consultationSessionId} />
    ) : next.status === 'confirmed' && next.consultationSessionId ? (
      <JoinCountdown scheduledAt={next.scheduledAt} label={t('joinCountdownLabel')} />
    ) : next.status === 'completed' && next.consultationSessionId ? (
      <ConsultationOutcomeAction consultationSessionId={next.consultationSessionId} />
    ) : null;

  return (
    <div className={`${PANEL_CLASSNAME} flex flex-col gap-4`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-caption font-semibold uppercase tracking-wider text-text-tertiary">{t('nextAppointmentEyebrow')}</p>
        <StatusBadge status={next.status} timeAware={{ scheduledAt: next.scheduledAt, endTime: next.endTime }} />
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <DateBlock date={next.scheduledAt} />
        <div className="flex min-w-0 flex-1 basis-56 flex-col gap-0.5">
          <p className="font-display text-h2 text-text-primary" data-numeric>
            {dayLabel} <span aria-hidden="true">·</span> {timeLabel}
          </p>
          <p className="text-small text-text-tertiary">{format.relativeTime(scheduledAt, new Date())}</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Two lines beside it (name, specialty): md, centred. */}
          <PersonAvatar name={next.doctorName} src={next.doctorAvatarUrl} size="md" />
          <div className="flex min-w-0 flex-col gap-0.5">
            <p className="text-body font-semibold text-text-primary">
              <bdi>{next.doctorName}</bdi>
            </p>
            <p className="text-small text-text-secondary">
              {pickLocalizedName(next.specialization, next.specializationAr, locale)}
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {primaryAction}
        <Button asChild variant="secondary" size="sm">
          <Link href={`/patient/appointments?highlight=${next.id}`}>{t('viewAppointmentAction')}</Link>
        </Button>
      </div>
    </div>
  );
}
