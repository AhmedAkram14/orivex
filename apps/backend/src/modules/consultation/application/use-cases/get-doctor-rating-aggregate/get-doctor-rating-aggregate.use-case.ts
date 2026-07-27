import type { DoctorRatingAggregate } from '../../../domain/repositories/consultation-feedback.repository.js';
import type { ConsultationFeedbackRepository } from '../../../domain/repositories/consultation-feedback.repository.js';

export interface GetDoctorRatingAggregateQuery {
  doctorId: string;
}

// Exported for DoctorModule to call directly (module-to-module use-case
// call, matching this codebase's established cross-module pattern -- e.g.
// GetConsultationSessionByAppointmentIdUseCase for ClinicalModule). Real-
// time AVG/COUNT, not a cached/materialized value -- see
// PrismaConsultationFeedbackRepository's own comment for why.
export class GetDoctorRatingAggregateUseCase {
  constructor(private readonly consultationFeedbackRepository: ConsultationFeedbackRepository) {}

  async execute(query: GetDoctorRatingAggregateQuery): Promise<DoctorRatingAggregate> {
    return this.consultationFeedbackRepository.getRatingAggregateForDoctor(query.doctorId);
  }
}
