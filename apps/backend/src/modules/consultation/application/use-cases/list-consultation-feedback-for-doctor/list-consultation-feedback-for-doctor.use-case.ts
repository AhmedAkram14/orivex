import type { ConsultationFeedback } from '../../../domain/entities/consultation-feedback.entity.js';
import type { ConsultationFeedbackRepository } from '../../../domain/repositories/consultation-feedback.repository.js';

import type { ListConsultationFeedbackForDoctorQuery } from './list-consultation-feedback-for-doctor.query.js';

export interface ListConsultationFeedbackForDoctorResult {
  feedback: ConsultationFeedback[];
  total: number;
}

// Public reviews list (per the approved scope: written comments are shown
// publicly on the doctor's directory/profile) -- exported for DoctorModule
// to call directly, same cross-module pattern as
// GetDoctorRatingAggregateUseCase.
export class ListConsultationFeedbackForDoctorUseCase {
  constructor(private readonly consultationFeedbackRepository: ConsultationFeedbackRepository) {}

  async execute(query: ListConsultationFeedbackForDoctorQuery): Promise<ListConsultationFeedbackForDoctorResult> {
    const { feedback, total } = await this.consultationFeedbackRepository.listForDoctor(
      query.doctorId,
      query.page,
      query.limit,
    );
    return { feedback, total };
  }
}
