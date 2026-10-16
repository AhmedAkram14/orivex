import type { ConsultationSession } from '../entities/consultation-session.entity.js';

export interface ConsultationSessionRepository {
  findById(id: string): Promise<ConsultationSession | null>;
  findByAppointmentId(appointmentId: string): Promise<ConsultationSession | null>;
  // Consultation Lifecycle Completion: backs the stale-session
  // reconciliation sweep -- any session still WaitingRoom/InProgress whose
  // last update AND whose appointment's scheduled start both predate the
  // cutoff, i.e. the visit was due long ago, nobody (doctor or patient) has
  // touched the session since, and the doctor never explicitly closed it.
  // A session of an upcoming appointment is never stale, however long ago
  // it was confirmed.
  findStale(updatedBefore: Date): Promise<ConsultationSession[]>;
  // Throws on a stale version (optimistic locking) -- callers must reload
  // and retry rather than treat this as a generic failure.
  save(session: ConsultationSession): Promise<void>;
}
