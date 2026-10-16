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

    // The appointment is completed (and so validated) before anything is
    // saved: closing a cancelled, rescheduled or no-show appointment's
    // leftover session as "completed" must leave both untouched, not persist
    // a completed session and then fail on the appointment.
    const appointment =
      command.completionReason === ConsultationCompletionReason.Completed
        ? await this.appointmentRepository.findById(session.getAppointmentId())
        : null;
    appointment?.complete();

    session.close(command.completionReason);
    await this.consultationSessionRepository.save(session);
    const events = [...session.releaseDomainEvents()];

    if (appointment) {
      await this.appointmentRepository.save(appointment);
      events.push(...appointment.releaseDomainEvents());
    }

    await this.eventDispatcher.dispatch(events);
    return session;
  }
}
