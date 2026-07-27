import type { ConsultationFeedback } from '../../../domain/entities/consultation-feedback.entity.js';
import type { ConsultationFeedbackRepository } from '../../../domain/repositories/consultation-feedback.repository.js';

export interface GetConsultationFeedbackForSessionQuery {
  consultationSessionId: string;
}

export class GetConsultationFeedbackForSessionUseCase {
  constructor(private readonly consultationFeedbackRepository: ConsultationFeedbackRepository) {}

  async execute(query: GetConsultationFeedbackForSessionQuery): Promise<ConsultationFeedback | null> {
    return this.consultationFeedbackRepository.findByConsultationSessionId(query.consultationSessionId);
  }
}
