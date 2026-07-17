import type { Appointment } from '../../../domain/entities/appointment.entity.js';
import type { AppointmentRepository } from '../../../domain/repositories/appointment.repository.js';

import type { ListAppointmentsForDoctorQuery } from './list-appointments-for-doctor.query.js';

// Pure read — mirrors ListAppointmentsForPatientUseCase's pattern, just
// scoped to every appointment owned by one doctor instead of one patient.
export class ListAppointmentsForDoctorUseCase {
  constructor(private readonly appointmentRepository: AppointmentRepository) {}

  async execute(query: ListAppointmentsForDoctorQuery): Promise<Appointment[]> {
    return this.appointmentRepository.findByDoctorId(query.doctorId);
  }
}
