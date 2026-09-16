import type { Appointment } from '../../../domain/entities/appointment.entity.js';
import type { AppointmentRepository } from '../../../domain/repositories/appointment.repository.js';

export interface FindAppointmentByPatientAndDoctorQuery {
  patientId: string;
  doctorId: string;
}

// Messaging re-threading (Phase 1): the published, module-boundary-safe way
// for MessagingModule to ask "has this pair ever had any appointment
// together, regardless of status or date" without importing
// AppointmentRepository directly (module-to-module calls only through a
// published interface, never another module's repository --
// docs/10-backend-architecture.md Section 11). Any single match is enough
// -- callers only need existence, never the full history.
export class FindAppointmentByPatientAndDoctorUseCase {
  constructor(private readonly appointmentRepository: AppointmentRepository) {}

  async execute(query: FindAppointmentByPatientAndDoctorQuery): Promise<Appointment | null> {
    return this.appointmentRepository.findByPatientAndDoctor(query.patientId, query.doctorId);
  }
}
