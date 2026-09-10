import { ForbiddenError, NotFoundError } from '../../../../../shared/errors/app-error.js';
import { GetDoctorProfileByAccountIdUseCase } from '../../../../doctor/application/use-cases/get-doctor-profile-by-account-id/get-doctor-profile-by-account-id.use-case.js';
import type { ConsultationFeedback } from '../../../domain/entities/consultation-feedback.entity.js';
import type { ConsultationFeedbackRepository } from '../../../domain/repositories/consultation-feedback.repository.js';

import type { FlagConsultationFeedbackCommand } from './flag-consultation-feedback.command.js';

// I11 -- Admin content moderation (ORIVEX Remaining Work Audit): the
// reviewed doctor's own precautionary flag on a review left about them --
// immediately excludes it from the public doctor-directory/profile list
// (ConsultationFeedbackRepository.listForDoctor's own Visible-only filter),
// pending an admin decision. Only the doctor this review is actually about
// may flag it -- never the reviewing patient (they can already edit/delete
// their own review) and never an unrelated doctor.
export class FlagConsultationFeedbackUseCase {
  constructor(
    private readonly consultationFeedbackRepository: ConsultationFeedbackRepository,
    private readonly getDoctorProfileByAccountIdUseCase: GetDoctorProfileByAccountIdUseCase,
  ) {}

  async execute(command: FlagConsultationFeedbackCommand): Promise<ConsultationFeedback> {
    const feedback = await this.consultationFeedbackRepository.findById(command.feedbackId);
    if (!feedback) {
      throw new NotFoundError(`ConsultationFeedback "${command.feedbackId}" not found.`);
    }

    const doctorProfile = await this.getDoctorProfileByAccountIdUseCase.execute({ accountId: command.callerAccountId });
    if (!doctorProfile || feedback.getDoctorId() !== doctorProfile.getId()) {
      throw new ForbiddenError('Only the doctor this review is about may flag it.');
    }

    feedback.flag(command.reason);
    await this.consultationFeedbackRepository.update(feedback);
    return feedback;
  }
}
