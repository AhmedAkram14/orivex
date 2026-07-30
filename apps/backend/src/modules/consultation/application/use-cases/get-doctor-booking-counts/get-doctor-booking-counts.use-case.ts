import { AppointmentStatus } from '../../../domain/enums/appointment-status.enum.js';
import type { AppointmentRepository } from '../../../domain/repositories/appointment.repository.js';

export interface GetDoctorBookingCountsQuery {
  doctorIds: string[];
}

// Batched sibling of GetDoctorRatingAggregatesUseCase -- backs the Popular
// Doctors "Most Booked" signal without one query per doctor per page. Counts
// only CONFIRMED/COMPLETED appointments -- a real, patient-committed booking,
// never a raw REQUESTED/CANCELLED/NO_SHOW row.
export class GetDoctorBookingCountsUseCase {
  constructor(private readonly appointmentRepository: AppointmentRepository) {}

  async execute(query: GetDoctorBookingCountsQuery): Promise<Map<string, number>> {
    return this.appointmentRepository.countByDoctorIds(query.doctorIds, [
      AppointmentStatus.Confirmed,
      AppointmentStatus.Completed,
    ]);
  }
}
