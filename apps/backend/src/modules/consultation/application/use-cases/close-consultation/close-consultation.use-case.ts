import { NotFoundError } from '../../../../../shared/errors/app-error.js';
import type { DomainEventDispatcher } from '../../../../../shared/domain/domain-event-dispatcher.js';
import type { ConsultationSession } from '../../../domain/entities/consultation-session.entity.js';
import { ConsultationCompletionReason } from '../../../domain/enums/consultation-completion-reason.enum.js';
import type { AppointmentRepository } from '../../../domain/repositories/appointment.repository.js';
import type { ConsultationSessionRepository } from '../../../domain/repositories/consultation-session.repository.js';

import type { CloseConsultationCommand } from './close-consultation.command.js';

// Plain TypeScript class — no NestJS dependency; DI wiring lives in
// consultation.module.ts only. Matches docs/12-openapi.md's
// /consultations/{id}/close: "Session closed; triggers ConsultationCompleted
// or ConsultationInterrupted event downstream." A completed outcome also
// marks the related Appointment Completed; an interrupted outcome leaves
// the Appointment Confirmed (it may still be retried/rescheduled later,
// out of this sprint's scope).
export class CloseConsultationUseCase {
  constructor(
    private readonly consultationSessionRepository: ConsultationSessionRepository,
    private readonly appointmentRepository: AppointmentRepository,
    private readonly eventDispatcher: DomainEventDispatcher,
  ) {}

  async execute(command: CloseConsultationCommand): Promise<ConsultationSession> {
    const session = await this.consultationSessionRepository.findById(command.consultationSessionId);
    if (!session) {
      throw new NotFoundError(`ConsultationSession "${command.consultationSessionId}" not found.`);
    }

    session.close(command.completionReason);
    await this.consultationSessionRepository.save(session);
    const events = [...session.releaseDomainEvents()];

    if (command.completionReason === ConsultationCompletionReason.Completed) {
      const appointment = await this.appointmentRepository.findById(session.getAppointmentId());
      if (appointment) {
        appointment.complete();
        await this.appointmentRepository.save(appointment);
        events.push(...appointment.releaseDomainEvents());
      }
    }

    await this.eventDispatcher.dispatch(events);
    return session;
  }
}
