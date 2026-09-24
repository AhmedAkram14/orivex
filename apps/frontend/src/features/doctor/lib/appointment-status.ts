import type { AppointmentStatus } from '@/features/doctor/api/types';

/**
 * Phase 1 UX remediation: the one shared definition of "upcoming" for a
 * doctor's own appointments on the frontend -- a non-terminal status
 * (Requested/Confirmed/Rescheduled) AND a scheduled time that hasn't passed
 * yet. Mirrors `DoctorAppointmentsController`'s `nextAppointmentAt`/
 * `upcoming-work` reasoning on the backend: a non-terminal appointment whose
 * own date has already passed is stale, not upcoming, even though nobody
 * has formally resolved it (no-show/cancel) yet.
 *
 * Extracted from the Patient Chart page, which used to bucket appointments
 * on status alone -- a Requested/Confirmed appointment days in the past
 * (never resolved) stayed "upcoming" forever there, while
 * `DoctorAppointmentsController`'s own `nextAppointmentAt` already excluded
 * it, so the two disagreed about the exact same appointment. Reuse this
 * anywhere else on the frontend that needs to bucket a doctor's own
 * appointments into upcoming/past from a raw list, instead of re-deriving
 * the same condition locally.
 *
 * Not used by Doctor Reports' "Upcoming" tile: that figure is intentionally
 * scoped differently (appointments dated *within the selected report
 * period*, not "still ahead of right now") per its own use case's "plan
 * decision 1" comment -- see the Phase 1 backend-proposal note in
 * IMPLEMENTATION_NOTES.md for why that wasn't changed to match this
 * definition.
 */
export const NON_TERMINAL_APPOINTMENT_STATUSES = new Set<AppointmentStatus>(['requested', 'confirmed', 'rescheduled']);

export function isUpcomingAppointment(
  appointment: { status: AppointmentStatus; scheduledAt: string | Date },
  now: Date = new Date(),
): boolean {
  return NON_TERMINAL_APPOINTMENT_STATUSES.has(appointment.status) && new Date(appointment.scheduledAt) > now;
}
