import type { Appointment } from '../entities/appointment.entity.js';

export interface AppointmentRepository {
  findById(id: string): Promise<Appointment | null>;
  // Throws on a stale version (optimistic locking) -- callers must reload
  // and retry rather than treat this as a generic failure.
  save(appointment: Appointment): Promise<void>;
}
