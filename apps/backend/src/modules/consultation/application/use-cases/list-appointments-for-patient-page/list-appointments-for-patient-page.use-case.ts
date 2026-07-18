import type { Appointment } from '../../../domain/entities/appointment.entity.js';
import type { AppointmentRepository } from '../../../domain/repositories/appointment.repository.js';

import type { ListAppointmentsForPatientPageQuery } from './list-appointments-for-patient-page.query.js';

export interface ListAppointmentsForPatientPageResult {
  items: Appointment[];
  total: number;
}

// Paginated sibling of ListAppointmentsForPatientUseCase -- backs
// GET /appointments/me (Production Readiness Audit -- "introduce pagination
// where required"). Kept separate rather than adding page/limit to the
// original use case since PatientDashboardController's aggregations
// genuinely need every appointment, not one page.
export class ListAppointmentsForPatientPageUseCase {
  constructor(private readonly appointmentRepository: AppointmentRepository) {}

  async execute(query: ListAppointmentsForPatientPageQuery): Promise<ListAppointmentsForPatientPageResult> {
    const skip = (query.page - 1) * query.limit;
    const [items, total] = await Promise.all([
      this.appointmentRepository.findByPatientIdPage(query.patientId, skip, query.limit),
      this.appointmentRepository.countByPatientId(query.patientId),
    ]);
    return { items, total };
  }
}
