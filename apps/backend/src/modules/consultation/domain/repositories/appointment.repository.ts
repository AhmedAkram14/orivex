import type { Appointment } from '../entities/appointment.entity.js';

export interface AppointmentRepository {
  findById(id: string): Promise<Appointment | null>;
  // Ordered by scheduledAt descending (most recent/upcoming first) -- the
  // only ordering a patient's own appointment list needs today.
  findByPatientId(patientId: string): Promise<Appointment[]>;
  // Throws on a stale version (optimistic locking) -- callers must reload
  // and retry rather than treat this as a generic failure.
  save(appointment: Appointment): Promise<void>;
}
