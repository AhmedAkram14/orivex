import { ConflictError, ForbiddenError, NotFoundError } from '../../../../../shared/errors/app-error.js';
import { GetDoctorProfileByAccountIdUseCase } from '../../../../doctor/application/use-cases/get-doctor-profile-by-account-id/get-doctor-profile-by-account-id.use-case.js';
import { FollowUpRecommendation } from '../../../domain/entities/follow-up-recommendation.entity.js';
import type { AppointmentRepository } from '../../../domain/repositories/appointment.repository.js';
import type { ConsultationSessionRepository } from '../../../domain/repositories/consultation-session.repository.js';
import type { FollowUpRecommendationRepository } from '../../../domain/repositories/follow-up-recommendation.repository.js';

import type { RecommendFollowUpCommand } from './recommend-follow-up.command.js';

// Plain TypeScript class — no NestJS dependency; DI wiring lives in
// consultation.module.ts only. No consultation-state gate (matches Clinical
// Notes/Diagnosis/Prescription's own precedent -- none of them require a
// specific session state either), so a doctor can record this during or
// after the call, same as the other clinical-documentation capabilities.
export class RecommendFollowUpUseCase {
  constructor(
    private readonly followUpRecommendationRepository: FollowUpRecommendationRepository,
    private readonly consultationSessionRepository: ConsultationSessionRepository,
    private readonly appointmentRepository: AppointmentRepository,
    private readonly getDoctorProfileByAccountIdUseCase: GetDoctorProfileByAccountIdUseCase,
  ) {}

  async execute(command: RecommendFollowUpCommand): Promise<FollowUpRecommendation> {
    const session = await this.consultationSessionRepository.findById(command.consultationSessionId);
    if (!session) {
      throw new NotFoundError(`ConsultationSession "${command.consultationSessionId}" not found.`);
    }

    const appointment = await this.appointmentRepository.findById(session.getAppointmentId());
    if (!appointment) {
      throw new NotFoundError(`Appointment "${session.getAppointmentId()}" not found.`);
    }

    const doctor = await this.getDoctorProfileByAccountIdUseCase.execute({
      accountId: command.authoringDoctorAccountId,
    });
    if (!doctor || appointment.getDoctorId() !== doctor.getId()) {
      throw new ForbiddenError('Only the treating doctor for this consultation may recommend a follow-up.');
    }

    const existing = await this.followUpRecommendationRepository.findByConsultationSessionId(
      command.consultationSessionId,
    );
    if (existing) {
      throw new ConflictError('A follow-up recommendation already exists for this consultation.');
    }

    const recommendation = FollowUpRecommendation.recommend({
      consultationSessionId: command.consultationSessionId,
      authoringDoctorId: doctor.getId(),
      reason: command.reason,
      recommendedDate: command.recommendedDate,
    });

    await this.followUpRecommendationRepository.save(recommendation);
    return recommendation;
  }
}
