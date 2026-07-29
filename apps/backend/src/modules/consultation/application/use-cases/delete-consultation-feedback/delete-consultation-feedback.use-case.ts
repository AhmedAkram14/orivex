import { ForbiddenError, NotFoundError } from '../../../../../shared/errors/app-error.js';
import type { RealtimeEmitterPort } from '../../../../../platform/realtime/ports/realtime-emitter.port.js';
import { GetPatientProfileByAccountIdUseCase } from '../../../../patient/application/use-cases/get-patient-profile-by-account-id/get-patient-profile-by-account-id.use-case.js';
import { GetDoctorProfileByIdUseCase } from '../../../../doctor/application/use-cases/get-doctor-profile-by-id/get-doctor-profile-by-id.use-case.js';
import type { ConsultationFeedbackRepository } from '../../../domain/repositories/consultation-feedback.repository.js';

import type { DeleteConsultationFeedbackCommand } from './delete-consultation-feedback.command.js';

// Plain TypeScript class — no NestJS dependency; DI wiring lives in
// consultation.module.ts only. Product follow-up (2026-07-29): the patient
// can now retract their own review entirely -- deleting the row (not a
// soft "hidden" flag) also frees the one-review-per-session unique
// constraint, so the patient can submit a fresh review afterward if they
// choose to. Same ownership derivation and live-refresh push as
// UpdateConsultationFeedbackUseCase.
export class DeleteConsultationFeedbackUseCase {
  constructor(
    private readonly consultationFeedbackRepository: ConsultationFeedbackRepository,
    private readonly getPatientProfileByAccountIdUseCase: GetPatientProfileByAccountIdUseCase,
    private readonly getDoctorProfileByIdUseCase: GetDoctorProfileByIdUseCase,
    private readonly realtimeEmitter: RealtimeEmitterPort,
  ) {}

  async execute(command: DeleteConsultationFeedbackCommand): Promise<void> {
    const feedback = await this.consultationFeedbackRepository.findByConsultationSessionId(
      command.consultationSessionId,
    );
    if (!feedback) {
      throw new NotFoundError(`No feedback exists yet for consultation session "${command.consultationSessionId}".`);
    }

    const patient = await this.getPatientProfileByAccountIdUseCase.execute({ accountId: command.patientAccountId });
    if (!patient || feedback.getPatientId() !== patient.getId()) {
      throw new ForbiddenError('Only the reviewer may delete this feedback.');
    }

    await this.consultationFeedbackRepository.delete(feedback.getId());

    const doctorProfile = await this.getDoctorProfileByIdUseCase.execute({ doctorProfileId: feedback.getDoctorId() });
    if (doctorProfile) {
      this.realtimeEmitter.emitToAccount(doctorProfile.getAccountId(), 'doctor-reviews.changed', {
        doctorProfileId: doctorProfile.getId(),
      });
    }
  }
}
