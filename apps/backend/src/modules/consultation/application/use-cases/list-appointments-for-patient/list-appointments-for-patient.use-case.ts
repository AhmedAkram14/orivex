import type { Appointment } from '../../../domain/entities/appointment.entity.js';
import type { AppointmentRepository } from '../../../domain/repositories/appointment.repository.js';

import type { ListAppointmentsForPatientQuery } from './list-appointments-for-patient.query.js';

// Pure read — mirrors GetAppointmentByIdUseCase's pattern, just scoped to
// every appointment owned by one patient instead of a single id.
export class ListAppointmentsForPatientUseCase {
  constructor(private readonly appointmentRepository: AppointmentRepository) {}

  async execute(query: ListAppointmentsForPatientQuery): Promise<Appointment[]> {
    return this.appointmentRepository.findByPatientId(query.patientId);
  }
}
