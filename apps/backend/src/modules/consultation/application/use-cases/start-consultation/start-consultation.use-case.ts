import { NotFoundError } from '../../../../../shared/errors/app-error.js';
import type { DomainEventDispatcher } from '../../../../../shared/domain/domain-event-dispatcher.js';
import type { ConsultationSession } from '../../../domain/entities/consultation-session.entity.js';
import type { AppointmentRepository } from '../../../domain/repositories/appointment.repository.js';
import type { ConsultationSessionRepository } from '../../../domain/repositories/consultation-session.repository.js';

import type { StartConsultationCommand } from './start-consultation.command.js';

// Plain TypeScript class — no NestJS dependency; DI wiring lives in
// consultation.module.ts only. Matches docs/12-openapi.md's
// /consultations/{id}/start: "Session transitioned to in_progress."
// The session's own WaitingRoom state is not enough: a cancelled,
// rescheduled or no-show appointment leaves its session in WaitingRoom until
// the stale-session sweep closes it hours later, so the appointment itself
// must still be Confirmed (Appointment.assertConsultationAllowed).
export class StartConsultationUseCase {
  constructor(
    private readonly consultationSessionRepository: ConsultationSessionRepository,
    private readonly appointmentRepository: AppointmentRepository,
    private readonly eventDispatcher: DomainEventDispatcher,
  ) {}

  async execute(command: StartConsultationCommand): Promise<ConsultationSession> {
    const session = await this.consultationSessionRepository.findById(command.consultationSessionId);
    if (!session) {
      throw new NotFoundError(`ConsultationSession "${command.consultationSessionId}" not found.`);
    }
    const appointment = await this.appointmentRepository.findById(session.getAppointmentId());
    if (!appointment) {
      throw new NotFoundError(`Appointment "${session.getAppointmentId()}" not found.`);
    }

    appointment.assertConsultationAllowed();
    session.start();

    await this.consultationSessionRepository.save(session);
    await this.eventDispatcher.dispatch(session.releaseDomainEvents());

    return session;
  }
}
