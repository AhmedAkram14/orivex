'use client';

import { useFormatter, useTranslations } from 'next-intl';
import type { Appointment } from '@/features/patient/api/types';
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
  const tType = useTranslations('patient.appointments.type');
  const format = useFormatter();

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
            counterpartyDetail={appointment.specialization}
            status={appointment.status}
            statusLabel={tStatus(appointment.status)}
            type={appointment.type}
            typeLabel={tType(appointment.type)}
            location={appointment.location}
          />
        </li>
      ))}
    </ul>
  );
}
