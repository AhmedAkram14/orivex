import { ForbiddenError, NotFoundError } from '../../../../../shared/errors/app-error.js';
import type { RealtimeEmitterPort } from '../../../../../platform/realtime/ports/realtime-emitter.port.js';
import { GetPatientProfileByAccountIdUseCase } from '../../../../patient/application/use-cases/get-patient-profile-by-account-id/get-patient-profile-by-account-id.use-case.js';
import { GetDoctorProfileByIdUseCase } from '../../../../doctor/application/use-cases/get-doctor-profile-by-id/get-doctor-profile-by-id.use-case.js';
import type { ConsultationFeedback } from '../../../domain/entities/consultation-feedback.entity.js';
import type { ConsultationFeedbackRepository } from '../../../domain/repositories/consultation-feedback.repository.js';

import type { UpdateConsultationFeedbackCommand } from './update-consultation-feedback.command.js';

// Plain TypeScript class — no NestJS dependency; DI wiring lives in
// consultation.module.ts only. Product follow-up (2026-07-29): the patient
// can now correct their own review. Ownership is derived from the
// feedback row itself (it already stores patientId, resolved server-side
// at submission time) rather than re-walking session -> appointment again
// -- simpler and just as trustworthy, since that patientId was never
// client-supplied to begin with.
//
// Pushes a live 'doctor-reviews.changed' event directly (RealtimeEmitterPort,
// not a Notification) so the doctor's own rating/review list refreshes if
// they happen to be looking at it -- a correction to an existing review
// isn't a new notification-worthy event the way the original submission is
// (NotifyDoctorOfConsultationFeedbackSubmittedHandler already covers that),
// it would just be repeat noise.
export class UpdateConsultationFeedbackUseCase {
  constructor(
    private readonly consultationFeedbackRepository: ConsultationFeedbackRepository,
    private readonly getPatientProfileByAccountIdUseCase: GetPatientProfileByAccountIdUseCase,
    private readonly getDoctorProfileByIdUseCase: GetDoctorProfileByIdUseCase,
    private readonly realtimeEmitter: RealtimeEmitterPort,
  ) {}

  async execute(command: UpdateConsultationFeedbackCommand): Promise<ConsultationFeedback> {
    const feedback = await this.consultationFeedbackRepository.findByConsultationSessionId(
      command.consultationSessionId,
    );
    if (!feedback) {
      throw new NotFoundError(`No feedback exists yet for consultation session "${command.consultationSessionId}".`);
    }

    const patient = await this.getPatientProfileByAccountIdUseCase.execute({ accountId: command.patientAccountId });
    if (!patient || feedback.getPatientId() !== patient.getId()) {
      throw new ForbiddenError('Only the reviewer may edit this feedback.');
    }

    feedback.update(command.rating, command.comment);
    await this.consultationFeedbackRepository.update(feedback);

    const doctorProfile = await this.getDoctorProfileByIdUseCase.execute({ doctorProfileId: feedback.getDoctorId() });
    if (doctorProfile) {
      this.realtimeEmitter.emitToAccount(doctorProfile.getAccountId(), 'doctor-reviews.changed', {
        doctorProfileId: doctorProfile.getId(),
      });
    }

    return feedback;
  }
}
