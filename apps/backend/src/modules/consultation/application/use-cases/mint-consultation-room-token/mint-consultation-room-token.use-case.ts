import { NotFoundError } from '../../../../../shared/errors/app-error.js';
import { ConsultationState } from '../../../domain/enums/consultation-state.enum.js';
import { ConsultationDomainError } from '../../../domain/exceptions/consultation-domain.error.js';
import type { AppointmentRepository } from '../../../domain/repositories/appointment.repository.js';
import type { ConsultationSessionRepository } from '../../../domain/repositories/consultation-session.repository.js';
import { buildRoomName } from '../../live-room-name.js';
import type { GenerateRoomTokenResult, RoomTokenGeneratorPort } from '../../ports/room-token-generator.port.js';

import type { MintConsultationRoomTokenCommand } from './mint-consultation-room-token.command.js';

// Join-Window Enforcement feature: a patient may only join starting this
// long before scheduledAt, and only until this long after it -- past that,
// the appointment is (or is about to be) reconciled No-show by
// MarkMissedAppointmentsNoShowUseCase's own sweep. Matches the frontend's
// canJoinCall exactly so the two never disagree. Doctor-side joining
// (Start Consultation from the Queue page) is intentionally untouched --
// this guard only ever applies to role 'patient'.
const JOIN_WINDOW_OPENS_BEFORE_MS = 15 * 60_000;
const JOIN_WINDOW_CLOSES_AFTER_MS = 60 * 60_000;

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
    private readonly appointmentRepository: AppointmentRepository,
    private readonly roomTokenGenerator: RoomTokenGeneratorPort,
  ) {}

  async execute(command: MintConsultationRoomTokenCommand, now: Date = new Date()): Promise<GenerateRoomTokenResult> {
    const session = await this.consultationSessionRepository.findById(command.consultationSessionId);
    if (!session) {
      throw new NotFoundError(`ConsultationSession "${command.consultationSessionId}" not found.`);
    }
    if (session.getState() === ConsultationState.Closed) {
      throw new ConsultationDomainError(`ConsultationSession "${session.getId()}" is closed; cannot join its room.`);
    }

    if (command.role === 'patient') {
      const appointment = await this.appointmentRepository.findById(session.getAppointmentId());
      if (appointment) {
        const scheduledAt = appointment.getScheduledAt().getTime();
        if (now.getTime() < scheduledAt - JOIN_WINDOW_OPENS_BEFORE_MS) {
          throw new ConsultationDomainError('This consultation is not open to join yet.');
        }
        if (now.getTime() > scheduledAt + JOIN_WINDOW_CLOSES_AFTER_MS) {
          throw new ConsultationDomainError('The join window for this consultation has closed.');
        }
      }
    }

    return this.roomTokenGenerator.generateToken({
      roomName: buildRoomName(session.getId()),
      identity: command.identity,
      displayName: command.displayName,
      role: command.role,
    });
  }
}
