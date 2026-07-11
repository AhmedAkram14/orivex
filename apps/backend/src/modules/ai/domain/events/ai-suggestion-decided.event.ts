import { DomainEvent } from '../../../../shared/domain/domain-event.js';

// Per docs/10-backend-architecture.md's AIModule catalog entry ("Owned
// events: ... AISuggestionApproved"). Generalized to "Decided" rather than
// literally "Approved" since docs/12-openapi.md's recordDoctorDecision
// accepts any of approved/edited/rejected -- all three equally resolve a
// suggestion's "unacknowledged" state, which is the only thing
// ClinicalModule's subscriber (docs/10-backend-architecture.md's "Events
// consumed: ... AISuggestionApproved (only entry point for AI-originated
// content, per the write-gate rule)") needs to react to.
export class AISuggestionDecidedEvent extends DomainEvent {
  readonly eventName = 'ai.suggestion.decided';

  constructor(
    public readonly suggestionId: string,
    public readonly consultationSessionId: string,
  ) {
    super();
  }
}
