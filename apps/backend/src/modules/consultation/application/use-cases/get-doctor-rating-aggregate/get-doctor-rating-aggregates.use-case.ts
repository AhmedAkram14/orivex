import type { ConsultationFeedbackRepository, DoctorRatingAggregate } from '../../../domain/repositories/consultation-feedback.repository.js';

export interface GetDoctorRatingAggregatesQuery {
  doctorIds: string[];
}

// Batched sibling of GetDoctorRatingAggregateUseCase -- backs a paginated
// doctor-directory listing without one aggregate query per doctor per page
// (matches this codebase's existing N+1-avoidance idiom, e.g. the
// appointment-summary DTOs' per-request doctorCache).
export class GetDoctorRatingAggregatesUseCase {
  constructor(private readonly consultationFeedbackRepository: ConsultationFeedbackRepository) {}

  async execute(query: GetDoctorRatingAggregatesQuery): Promise<Map<string, DoctorRatingAggregate>> {
    return this.consultationFeedbackRepository.getRatingAggregatesForDoctors(query.doctorIds);
  }
}
