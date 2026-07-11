import type { ConsultationSession } from '../entities/consultation-session.entity.js';

export interface ConsultationSessionRepository {
  findById(id: string): Promise<ConsultationSession | null>;
  findByAppointmentId(appointmentId: string): Promise<ConsultationSession | null>;
  // Throws on a stale version (optimistic locking) -- callers must reload
  // and retry rather than treat this as a generic failure.
  save(session: ConsultationSession): Promise<void>;
}
