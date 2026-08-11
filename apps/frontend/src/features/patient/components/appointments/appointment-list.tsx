'use client';

import { useFormatter, useLocale, useTranslations } from 'next-intl';
import { ConsultationOutcomeAction } from '@/features/consultation/components/consultation-outcome-action';
import { PayNowAction } from '@/features/payment/components/pay-now-action';
import type { Appointment } from '@/features/patient/api/types';
import { JoinCallAction } from '@/features/telemedicine/components/join-call-action';
import { pickLocalizedName } from '@/shared/i18n/localized-name';
import { AppointmentCard } from '@/shared/ui/appointments/appointment-card';
import { EmptyState } from '@/shared/ui/empty-state';

export interface AppointmentListProps {
  appointments: Appointment[];
  emptyTitle: string;
  emptyDescription: string;
}

/** Renders a list of `AppointmentCard`s from real `Appointment` data — the shared rendering both the Upcoming and History tabs use, so formatting/translation logic lives in exactly one place. */
export function AppointmentList({ appointments, emptyTitle, emptyDescription }: AppointmentListProps) {
  const tStatus = useTranslations('patient.appointments.status');
  const tConsultationType = useTranslations('patient.appointments.consultationType');
  const format = useFormatter();
  const locale = useLocale();

  if (appointments.length === 0) {
    return <EmptyState title={emptyTitle} description={emptyDescription} />;
  }

  return (
    <ul className="flex flex-col gap-3">
      {appointments.map((appointment) => (
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
            actions={
              // Consultation Pricing Lifecycle Completion (pay-then-confirm):
              // no ConsultationSession exists yet while a Paid appointment
              // is still awaiting payment (one only opens once payment
              // succeeds) -- paymentRequired already means "Paid and still
              // Requested," so it alone is the correct gate here, not a
              // consultationSessionId that can't exist at this point.
              appointment.paymentRequired && appointment.feeAmount ? (
                <PayNowAction appointmentId={appointment.id} amount={appointment.feeAmount} />
              ) : appointment.status === 'confirmed' && appointment.consultationSessionId ? (
                <JoinCallAction consultationSessionId={appointment.consultationSessionId} />
              ) : appointment.status === 'completed' && appointment.consultationSessionId ? (
                <ConsultationOutcomeAction consultationSessionId={appointment.consultationSessionId} />
              ) : undefined
            }
          />
        </li>
      ))}
    </ul>
  );
}
