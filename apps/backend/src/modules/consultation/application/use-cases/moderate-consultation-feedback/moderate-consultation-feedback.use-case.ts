import { NotFoundError } from '../../../../../shared/errors/app-error.js';
import type { ConsultationFeedback } from '../../../domain/entities/consultation-feedback.entity.js';
import type { ConsultationFeedbackRepository } from '../../../domain/repositories/consultation-feedback.repository.js';

import type { ModerateConsultationFeedbackCommand } from './moderate-consultation-feedback.command.js';

// I11 -- Admin content moderation: the SuperAdmin's own decision on a
// review, whether or not it was ever flagged first (a direct-hide is real
// too -- an admin doesn't have to wait for the reviewed doctor to notice).
// Ownership/role is entirely enforced by AdministrationController's own
// class-level @Roles(SuperAdmin) guard -- this use case does no further
// authorization check, matching every other admin-moderation use case in
// this codebase (e.g. ReviewVerificationCaseUseCase).
export class ModerateConsultationFeedbackUseCase {
  constructor(private readonly consultationFeedbackRepository: ConsultationFeedbackRepository) {}

  async execute(command: ModerateConsultationFeedbackCommand): Promise<ConsultationFeedback> {
    const feedback = await this.consultationFeedbackRepository.findById(command.feedbackId);
    if (!feedback) {
      throw new NotFoundError(`ConsultationFeedback "${command.feedbackId}" not found.`);
    }

    feedback.moderate(command.status, command.reason, command.moderatorAccountId);
    await this.consultationFeedbackRepository.update(feedback);
    return feedback;
  }
}
