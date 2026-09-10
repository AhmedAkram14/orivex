import type { ConsultationFeedback } from '../../../domain/entities/consultation-feedback.entity.js';
import type { ConsultationFeedbackRepository } from '../../../domain/repositories/consultation-feedback.repository.js';

import type { ListConsultationFeedbackByModerationStatusQuery } from './list-consultation-feedback-by-moderation-status.query.js';

export interface ListConsultationFeedbackByModerationStatusResult {
  feedback: ConsultationFeedback[];
  total: number;
}

// I11 -- Admin content moderation: the admin moderation queue -- defaults
// to Flagged (what an admin needs to act on) but accepts any status so the
// same queue view can also show what's already Hidden.
export class ListConsultationFeedbackByModerationStatusUseCase {
  constructor(private readonly consultationFeedbackRepository: ConsultationFeedbackRepository) {}

  async execute(
    query: ListConsultationFeedbackByModerationStatusQuery,
  ): Promise<ListConsultationFeedbackByModerationStatusResult> {
    const { feedback, total } = await this.consultationFeedbackRepository.listByModerationStatus(
      query.status,
      query.page,
      query.limit,
    );
    return { feedback, total };
  }
}
