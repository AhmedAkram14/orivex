import { DomainEvent } from '../../../../shared/domain/domain-event.js';

// Per docs/10-backend-architecture.md's ClinicalModule catalog entry
// ("Events published: ..., JourneyUpdated, ...").
export class JourneyUpdatedEvent extends DomainEvent {
  readonly eventName = 'clinical.journey.updated';

  constructor(public readonly healthJourneyId: string) {
    super();
  }
}
