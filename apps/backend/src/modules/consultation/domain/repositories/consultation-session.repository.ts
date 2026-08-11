import type { ConsultationSession } from '../entities/consultation-session.entity.js';

export interface ConsultationSessionRepository {
  findById(id: string): Promise<ConsultationSession | null>;
  findByAppointmentId(appointmentId: string): Promise<ConsultationSession | null>;
  // Consultation Lifecycle Completion: backs the stale-session
  // reconciliation sweep -- any session still WaitingRoom/InProgress whose
  // last update predates the cutoff, i.e. nobody (doctor or patient) has
  // touched it in a long time and the doctor never explicitly closed it.
  findStale(updatedBefore: Date): Promise<ConsultationSession[]>;
  // Throws on a stale version (optimistic locking) -- callers must reload
  // and retry rather than treat this as a generic failure.
  save(session: ConsultationSession): Promise<void>;
}
