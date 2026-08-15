'use client';

import type { ReactNode } from 'react';
import { useFormatter, useLocale, useTranslations } from 'next-intl';
import { ConsultationOutcomeAction } from '@/features/consultation/components/consultation-outcome-action';
import { PayNowAction } from '@/features/payment/components/pay-now-action';
import { CancelAction } from '@/features/patient/components/appointments/cancel-action';
import { RescheduleAction } from '@/features/patient/components/appointments/reschedule-action';
import type { Appointment } from '@/features/patient/api/types';
import { isAppointmentStillUpcoming } from '@/features/patient/lib/appointment-time';
import { JoinCallAction } from '@/features/telemedicine/components/join-call-action';
import { pickLocalizedName } from '@/shared/i18n/localized-name';
import { AppointmentCard } from '@/shared/ui/appointments/appointment-card';
import { EmptyState } from '@/shared/ui/empty-state';

/**
 * Patient-Facing Reschedule (Phase 3 Step 2): only a still-Requested or
 * Confirmed appointment can actually be rescheduled (matches the real
 * backend's own `Appointment.markRescheduled()` guard exactly) -- a
 * Rescheduled/Cancelled/Completed/No-show appointment is terminal or
 * already superseded, so no Reschedule action is ever offered for one.
 */
function canReschedule(appointment: Appointment): boolean {
  return (appointment.status === 'requested' || appointment.status === 'confirmed') && isAppointmentStillUpcoming(appointment.scheduledAt);
}

/**
 * Demo Readiness P0: only a still-Requested or Confirmed appointment can
 * actually be cancelled (matches the real backend's own
 * `RescheduleOrCancelAppointmentUseCase.cancel()` guard exactly) -- the same
 * eligibility as reschedule, so both actions always appear together.
 */
function canCancel(appointment: Appointment): boolean {
  return appointment.status === 'requested' || appointment.status === 'confirmed';
}

/**
 * Demo Readiness P0: true exactly when cancelling would trigger a real
 * refund -- a Paid appointment that is already Confirmed (i.e. already
 * paid; `paymentRequired` is false again once payment succeeds). A
 * still-Requested Paid appointment hasn't been charged yet, so cancelling it
 * never refunds anything.
 */
function cancelWillRefund(appointment: Appointment): boolean {
  return appointment.consultationType === 'paid' && appointment.status === 'confirmed';
}

export interface AppointmentListProps {
  appointments: Appointment[];
  emptyTitle: string;
  emptyDescription: string;
  /** The `?consultationSessionId=` a "Consultation completed" notification deep-links with -- the matching completed appointment's `ConsultationOutcomeAction` auto-opens its summary dialog on mount. Undefined for a normal page visit. */
  autoOpenConsultationSessionId?: string;
}

/** Renders a list of `AppointmentCard`s from real `Appointment` data — the shared rendering both the Upcoming and History tabs use, so formatting/translation logic lives in exactly one place. */
export function AppointmentList({ appointments, emptyTitle, emptyDescription, autoOpenConsultationSessionId }: AppointmentListProps) {
  const tStatus = useTranslations('patient.appointments.status');
  const tConsultationType = useTranslations('patient.appointments.consultationType');
  const format = useFormatter();
  const locale = useLocale();

  if (appointments.length === 0) {
    return <EmptyState title={emptyTitle} description={emptyDescription} />;
  }

  return (
    <ul className="flex flex-col gap-3">
      {appointments.map((appointment) => {
        // At most one of these three (mutually exclusive by real appointment
        // state), plus an independent Reschedule action for any still-
        // Requested/Confirmed appointment -- e.g. a Paid-and-unpaid
        // appointment shows both "Pay now" and "Reschedule" together.
        const primaryAction: ReactNode =
          // Consultation Pricing Lifecycle Completion (pay-then-confirm): no
          // ConsultationSession exists yet while a Paid appointment is still
          // awaiting payment (one only opens once payment succeeds) --
          // paymentRequired already means "Paid and still Requested," so it
          // alone is the correct gate here, not a consultationSessionId that
          // can't exist at this point.
          appointment.paymentRequired && appointment.feeAmount ? (
            <PayNowAction appointmentId={appointment.id} amount={appointment.feeAmount} />
          ) : appointment.status === 'confirmed' &&
            appointment.consultationSessionId &&
            isAppointmentStillUpcoming(appointment.scheduledAt) ? (
            <JoinCallAction consultationSessionId={appointment.consultationSessionId} />
          ) : appointment.status === 'completed' && appointment.consultationSessionId ? (
            <ConsultationOutcomeAction
              consultationSessionId={appointment.consultationSessionId}
              autoOpen={appointment.consultationSessionId === autoOpenConsultationSessionId}
            />
          ) : null;

        const actions =
          primaryAction || canReschedule(appointment) || canCancel(appointment) ? (
            <>
              {primaryAction}
              {canReschedule(appointment) && (
                <RescheduleAction appointmentId={appointment.id} doctorId={appointment.doctorId} />
              )}
              {canCancel(appointment) && (
                <CancelAction appointmentId={appointment.id} willRefund={cancelWillRefund(appointment)} />
              )}
            </>
          ) : undefined;

        return (
          <li key={appointment.id}>
            <AppointmentCard
              scheduledAtLabel={format.dateTime(new Date(appointment.scheduledAt), {
                year: 'numeric',
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
              actions={actions}
            />
          </li>
        );
      })}
    </ul>
  );
}
