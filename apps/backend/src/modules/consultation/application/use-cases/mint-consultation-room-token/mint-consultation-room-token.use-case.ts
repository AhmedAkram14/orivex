import { NotFoundError } from '../../../../../shared/errors/app-error.js';
import { ConsultationState } from '../../../domain/enums/consultation-state.enum.js';
import { ConsultationDomainError } from '../../../domain/exceptions/consultation-domain.error.js';
import type { ConsultationSessionRepository } from '../../../domain/repositories/consultation-session.repository.js';
import { buildRoomName } from '../../live-room-name.js';
import type { GenerateRoomTokenResult, RoomTokenGeneratorPort } from '../../ports/room-token-generator.port.js';

import type { MintConsultationRoomTokenCommand } from './mint-consultation-room-token.command.js';

// Plain TypeScript class — no NestJS dependency; DI wiring lives in
// consultation.module.ts only (ORIVEX Roadmap 2.0 Stage 2 — Telemedicine).
// Mints a short-lived LiveKit room-access token scoped to exactly one
// consultation's own room (`consultation-{sessionId}`); ownership of the
// caller against that session is the controller's responsibility (same
// split as start()/close() on this same session, presentation/controllers/
// consultation.controller.ts's ensureOwnedByCaller()).
export class MintConsultationRoomTokenUseCase {
  constructor(
    private readonly consultationSessionRepository: ConsultationSessionRepository,
    private readonly roomTokenGenerator: RoomTokenGeneratorPort,
  ) {}

  async execute(command: MintConsultationRoomTokenCommand): Promise<GenerateRoomTokenResult> {
    const session = await this.consultationSessionRepository.findById(command.consultationSessionId);
    if (!session) {
      throw new NotFoundError(`ConsultationSession "${command.consultationSessionId}" not found.`);
    }
    if (session.getState() === ConsultationState.Closed) {
      throw new ConsultationDomainError(`ConsultationSession "${session.getId()}" is closed; cannot join its room.`);
    }

    return this.roomTokenGenerator.generateToken({
      roomName: buildRoomName(session.getId()),
      identity: command.identity,
      displayName: command.displayName,
      role: command.role,
    });
  }
}
