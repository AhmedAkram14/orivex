import { ConflictError, ForbiddenError, NotFoundError, ValidationError } from '../../../../../shared/errors/app-error.js';
import type { DomainEventDispatcher } from '../../../../../shared/domain/domain-event-dispatcher.js';
import { GetPatientProfileByAccountIdUseCase } from '../../../../patient/application/use-cases/get-patient-profile-by-account-id/get-patient-profile-by-account-id.use-case.js';
import { ConsultationFeedback } from '../../../domain/entities/consultation-feedback.entity.js';
import { ConsultationCompletionReason } from '../../../domain/enums/consultation-completion-reason.enum.js';
import type { AppointmentRepository } from '../../../domain/repositories/appointment.repository.js';
import type { ConsultationFeedbackRepository } from '../../../domain/repositories/consultation-feedback.repository.js';
import type { ConsultationSessionRepository } from '../../../domain/repositories/consultation-session.repository.js';

import type { SubmitConsultationFeedbackCommand } from './submit-consultation-feedback.command.js';

// Plain TypeScript class — no NestJS dependency; DI wiring lives in
// consultation.module.ts only. Enforces every rule §9 of the consultation-
// completion follow-up requires, entirely server-side (never trusting a
// frontend-supplied doctorId/patientId):
//   - the session must genuinely be Completed (ConsultationCompletionReason
//     .Completed, not just Closed -- Interrupted also lands in Closed state
//     but must NOT be reviewable);
//   - the caller must be the treating patient (derived from the session's
//     own Appointment, never trusted from the route/body);
//   - doctorId is likewise derived from the Appointment, never client-
//     supplied;
//   - exactly one review per session (checked here AND enforced by a unique
//     DB constraint -- belt and suspenders against a race between two
//     concurrent submissions);
//   - rating range is validated inside ConsultationFeedback.submit() itself.
export class SubmitConsultationFeedbackUseCase {
  constructor(
    private readonly consultationFeedbackRepository: ConsultationFeedbackRepository,
    private readonly consultationSessionRepository: ConsultationSessionRepository,
    private readonly appointmentRepository: AppointmentRepository,
    private readonly getPatientProfileByAccountIdUseCase: GetPatientProfileByAccountIdUseCase,
    private readonly eventDispatcher: DomainEventDispatcher,
  ) {}

  async execute(command: SubmitConsultationFeedbackCommand): Promise<ConsultationFeedback> {
    const session = await this.consultationSessionRepository.findById(command.consultationSessionId);
    if (!session) {
      throw new NotFoundError(`ConsultationSession "${command.consultationSessionId}" not found.`);
    }

    if (session.getCompletionReason() !== ConsultationCompletionReason.Completed) {
      throw new ValidationError('This consultation has not been completed yet, so it cannot be reviewed.');
    }

    const appointment = await this.appointmentRepository.findById(session.getAppointmentId());
    if (!appointment) {
      throw new NotFoundError(`Appointment "${session.getAppointmentId()}" not found.`);
    }

    const patient = await this.getPatientProfileByAccountIdUseCase.execute({ accountId: command.patientAccountId });
    if (!patient || appointment.getPatientId() !== patient.getId()) {
      throw new ForbiddenError('Only the treated patient may review this consultation.');
    }

    const existing = await this.consultationFeedbackRepository.findByConsultationSessionId(
      command.consultationSessionId,
    );
    if (existing) {
      throw new ConflictError('This consultation has already been reviewed.');
    }

    const feedback = ConsultationFeedback.submit({
      consultationSessionId: command.consultationSessionId,
      patientId: patient.getId(),
      doctorId: appointment.getDoctorId(),
      rating: command.rating,
      comment: command.comment,
    });

    await this.consultationFeedbackRepository.save(feedback);
    await this.eventDispatcher.dispatch(feedback.releaseDomainEvents());

    return feedback;
  }
}
