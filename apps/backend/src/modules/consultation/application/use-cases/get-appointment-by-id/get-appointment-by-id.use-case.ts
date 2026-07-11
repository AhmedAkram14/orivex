import type { Appointment } from '../../../domain/entities/appointment.entity.js';
import type { AppointmentRepository } from '../../../domain/repositories/appointment.repository.js';

import type { GetAppointmentByIdQuery } from './get-appointment-by-id.query.js';

// Pure read — returns null on absence rather than throwing (mirrors the
// established Get*ByIdUseCase pattern).
export class GetAppointmentByIdUseCase {
  constructor(private readonly appointmentRepository: AppointmentRepository) {}

  async execute(query: GetAppointmentByIdQuery): Promise<Appointment | null> {
    return this.appointmentRepository.findById(query.appointmentId);
  }
}
