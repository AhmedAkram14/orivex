import type { Appointment } from '../entities/appointment.entity.js';
import type { AppointmentStatus } from '../enums/appointment-status.enum.js';

export interface AppointmentRepository {
  findById(id: string): Promise<Appointment | null>;
  // Ordered by scheduledAt descending (most recent/upcoming first) -- the
  // only ordering a patient's own appointment list needs today. Unbounded --
  // GET /appointments/me uses findByPatientIdPage/countByPatientId below
  // instead (Production Readiness Audit -- "introduce pagination where
  // required"); other consumers (booking conflict checks, dashboards) still
  // need every appointment regardless of page.
  findByPatientId(patientId: string): Promise<Appointment[]>;
  findByPatientIdPage(patientId: string, skip: number, take: number): Promise<Appointment[]>;
  countByPatientId(patientId: string): Promise<number>;
  // Ordered by scheduledAt ascending (soonest first) -- backs a doctor's
  // "what's coming up" view, the opposite ordering need from a patient's list.
  findByDoctorId(doctorId: string): Promise<Appointment[]>;
  // Same ordering as findByDoctorId, scoped to a [start, end) window at the
  // database level -- backs "today's appointments" (dashboard summary,
  // queue) without fetching a doctor's entire appointment history to filter
  // it in memory (Production Readiness Audit finding).
  findByDoctorIdForDateRange(doctorId: string, start: Date, end: Date): Promise<Appointment[]>;
  // Batched sibling of the per-doctor finders above -- backs a paginated
  // directory listing's "how many real bookings does this doctor have"
  // signal without one query per doctor per page (same N+1-avoidance idiom
  // as ConsultationFeedbackRepository.getRatingAggregatesForDoctors).
  countByDoctorIds(doctorIds: string[], statuses: AppointmentStatus[]): Promise<Map<string, number>>;
  // Single-doctor sibling of countByDoctorIds -- backs the doctor's own
  // Reports page, one query for every real status count at once rather
  // than a separate count() call per status.
  countByStatusForDoctor(doctorId: string): Promise<Partial<Record<AppointmentStatus, number>>>;
  // Join-Window Enforcement feature: backs the No-show reconciliation sweep
  // -- a Confirmed appointment scheduled before the cutoff whose own
  // ConsultationSession never left WaitingRoom (nobody, doctor or patient,
  // ever actually joined). Mirrors ConsultationSessionRepository.findStale's
  // "system sweep" precedent.
  findConfirmedPastJoinWindowMissed(cutoff: Date): Promise<Appointment[]>;
  // Throws on a stale version (optimistic locking) -- callers must reload
  // and retry rather than treat this as a generic failure.
  save(appointment: Appointment): Promise<void>;
}
