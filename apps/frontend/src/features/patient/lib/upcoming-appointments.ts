import type { Appointment, AppointmentStatus } from '@/features/patient/api/types';
import { isAppointmentStillUpcoming } from '@/features/patient/lib/appointment-time';
import { getCairoNow } from '@/shared/lib/date/timezone';

/**
 * The single patient-side definition of "upcoming": a non-terminal status
 * AND not yet past (see `isAppointmentStillUpcoming` -- start in the future,
 * or still the same Cairo calendar day). The Overview hero, its summary
 * strip, its upcoming list AND the Appointments page's Upcoming tab all
 * read this, so they can never disagree again (previously the Overview
 * applied only the status check and showed weeks-old "Confirmed" requests as
 * the next appointment).
 */
export const PATIENT_UPCOMING_STATUSES: AppointmentStatus[] = ['requested', 'confirmed', 'rescheduled'];

const EXPIRED_REQUEST_LOOKBACK_DAYS = 30;

function byScheduledAtAsc(a: Appointment, b: Appointment): number {
  return new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime();
}

export function isUpcomingAppointmentForPatient(appointment: Appointment, now: Date = getCairoNow()): boolean {
  return PATIENT_UPCOMING_STATUSES.includes(appointment.status) && isAppointmentStillUpcoming(appointment.scheduledAt, now);
}

/** Genuinely upcoming appointments, soonest first. */
export function selectUpcomingAppointments(appointments: Appointment[], now: Date = getCairoNow()): Appointment[] {
  return appointments.filter((appointment) => isUpcomingAppointmentForPatient(appointment, now)).sort(byScheduledAtAsc);
}

/** Everything the Upcoming tab does not show (terminal, or non-terminal but already past). */
export function selectPastAppointments(appointments: Appointment[], now: Date = getCairoNow()): Appointment[] {
  return appointments.filter((appointment) => !isUpcomingAppointmentForPatient(appointment, now));
}

export interface NeedsAttention {
  /** Still requested/confirmed/rescheduled although the date has passed -- nothing resolved it. */
  awaitingUpdate: Appointment[];
  /** Requests that lapsed unanswered, within the lookback window. */
  expired: Appointment[];
}

export function selectNeedsAttention(appointments: Appointment[], now: Date = getCairoNow()): NeedsAttention {
  const cutoff = now.getTime() - EXPIRED_REQUEST_LOOKBACK_DAYS * 24 * 60 * 60 * 1000;
  const newestFirst = (a: Appointment, b: Appointment) => byScheduledAtAsc(b, a);
  return {
    awaitingUpdate: appointments
      .filter((appointment) => PATIENT_UPCOMING_STATUSES.includes(appointment.status) && !isAppointmentStillUpcoming(appointment.scheduledAt, now))
      .sort(newestFirst),
    expired: appointments
      .filter((appointment) => appointment.status === 'expired' && new Date(appointment.scheduledAt).getTime() >= cutoff)
      .sort(newestFirst),
  };
}

/** The most recent completed appointment -- backs "Book again with Dr. X". */
export function selectLastCompletedAppointment(appointments: Appointment[]): Appointment | undefined {
  return appointments.filter((appointment) => appointment.status === 'completed').sort((a, b) => byScheduledAtAsc(b, a))[0];
}
