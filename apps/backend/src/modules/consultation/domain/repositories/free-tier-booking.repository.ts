import type { Appointment } from '../entities/appointment.entity.js';

export interface FreeTierBookingCaps {
  maxFreeConsultationsPerMonth: number;
  maxNoShowsBeforeBlocked: number;
  // Start of the current authoritative period (UTC calendar month, matching
  // book-appointment.use-case.ts's own startOfCurrentMonthUtc() -- computed
  // by the caller, not this port, so the period boundary stays owned by the
  // one place that already defines it).
  freeConsultationsWindowStart: Date;
}

export type FreeTierBookingOutcome = 'booked' | 'monthly_cap_exceeded' | 'no_show_blocked';

// I8 -- Free-tier abuse controls, concurrency fix. A plain
// AppointmentRepository.countX() followed later by a separate .save() call
// is a classic "SELECT count -> if allowed -> INSERT" race: two concurrent
// free bookings for the same patient can each read a stale, still-under-cap
// count and both succeed, together exceeding MAX_FREE_CONSULTATIONS_PER_MONTH.
// This port's single method re-validates both free-tier caps and persists
// the Appointment atomically -- one database transaction, serialized per
// patient -- so that invariant can never be violated regardless of request
// concurrency. Deliberately a separate, narrow port rather than a new
// AppointmentRepository method: adding a required method there would touch
// every one of its ~36 existing fakes across the codebase for a concern
// that only this one use case (booking a FREE appointment) needs.
export interface FreeTierBookingRepository {
  checkCapsAndSave(appointment: Appointment, patientId: string, caps: FreeTierBookingCaps): Promise<FreeTierBookingOutcome>;
}
