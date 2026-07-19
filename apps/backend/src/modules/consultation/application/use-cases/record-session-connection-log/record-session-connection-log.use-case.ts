import { ConsultationState } from '../../../domain/enums/consultation-state.enum.js';
import type { ConsultationSessionRepository } from '../../../domain/repositories/consultation-session.repository.js';

import type { RecordSessionConnectionLogCommand } from './record-session-connection-log.command.js';

// Plain TypeScript class — no NestJS dependency; DI wiring lives in
// consultation.module.ts only (ORIVEX Roadmap 2.0 Stage 2 — Telemedicine).
// Deliberately silent (never throws) on an unknown session id or an
// already-Closed session -- a webhook receiver must never fail loudly on a
// stray or late-arriving LiveKit event for a room that's already gone, the
// same tolerant idiom ReconcileStripeWebhookEventUseCase already
// establishes for Stripe's own webhook events.
export class RecordSessionConnectionLogUseCase {
  constructor(private readonly consultationSessionRepository: ConsultationSessionRepository) {}

  async execute(command: RecordSessionConnectionLogCommand): Promise<void> {
    const session = await this.consultationSessionRepository.findById(command.consultationSessionId);
    if (!session || session.getState() === ConsultationState.Closed) {
      return;
    }

    session.addConnectionLog(command.note);
    await this.consultationSessionRepository.save(session);
  }
}
