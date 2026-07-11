import { NotFoundError } from '../../../../../shared/errors/app-error.js';
import type { DomainEventDispatcher } from '../../../../../shared/domain/domain-event-dispatcher.js';
import type { ConsultationSession } from '../../../domain/entities/consultation-session.entity.js';
import type { ConsultationSessionRepository } from '../../../domain/repositories/consultation-session.repository.js';

import type { StartConsultationCommand } from './start-consultation.command.js';

// Plain TypeScript class — no NestJS dependency; DI wiring lives in
// consultation.module.ts only. Matches docs/12-openapi.md's
// /consultations/{id}/start: "Session transitioned to in_progress."
export class StartConsultationUseCase {
  constructor(
    private readonly consultationSessionRepository: ConsultationSessionRepository,
    private readonly eventDispatcher: DomainEventDispatcher,
  ) {}

  async execute(command: StartConsultationCommand): Promise<ConsultationSession> {
    const session = await this.consultationSessionRepository.findById(command.consultationSessionId);
    if (!session) {
      throw new NotFoundError(`ConsultationSession "${command.consultationSessionId}" not found.`);
    }

    session.start();

    await this.consultationSessionRepository.save(session);
    await this.eventDispatcher.dispatch(session.releaseDomainEvents());

    return session;
  }
}
