import type { PendingAISuggestionAcknowledgmentRepository } from '../../domain/repositories/pending-ai-suggestion-acknowledgment.repository.js';

export interface AISuggestionGeneratedEventPayload {
  suggestionId: string;
  consultationSessionId: string;
  requiresAcknowledgment: boolean;
}

export interface AISuggestionDecidedEventPayload {
  suggestionId: string;
}

// Plain TypeScript class — no NestJS dependency; subscription wiring lives
// in clinical.module.ts only. This is the concrete mechanism for
// SignPrescriptionUseCase's "blocked with 422 if an unacknowledged
// Warning-tier AI suggestion exists" check (docs/12-openapi.md) without
// ClinicalModule ever depending on AIModule (docs/10-backend-
// architecture.md's hard dependency rule): Clinical only ever reacts to
// AIModule's already-published domain events, carried over the shared
// DomainEventDispatcher port.
export class PendingAISuggestionAcknowledgmentHandler {
  constructor(private readonly repository: PendingAISuggestionAcknowledgmentRepository) {}

  async handleSuggestionGenerated(event: AISuggestionGeneratedEventPayload): Promise<void> {
    if (!event.requiresAcknowledgment) {
      return;
    }
    await this.repository.createPending(event.suggestionId, event.consultationSessionId);
  }

  async handleSuggestionDecided(event: AISuggestionDecidedEventPayload): Promise<void> {
    await this.repository.acknowledge(event.suggestionId);
  }
}
