import { DomainEvent } from '../../../../shared/domain/domain-event.js';

// Per docs/10-backend-architecture.md's AIModule catalog entry ("Events
// published: AISuggestionGenerated"). requiresAcknowledgment is carried on
// the event itself so ClinicalModule's own event subscriber can decide
// whether this suggestion needs to be tracked as a pending acknowledgment,
// without ever querying AIModule back (docs/10-backend-architecture.md's
// hard "Clinical never depends on AIModule" rule).
export class AISuggestionGeneratedEvent extends DomainEvent {
  readonly eventName = 'ai.suggestion.generated';

  constructor(
    public readonly suggestionId: string,
    public readonly consultationSessionId: string,
    public readonly requiresAcknowledgment: boolean,
  ) {
    super();
  }
}
