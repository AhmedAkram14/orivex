import { DomainEvent } from '../../../../shared/domain/domain-event.js';

// Per docs/10-backend-architecture.md's ClinicalModule catalog entry
// ("Events published: HealthGraphUpdated, JourneyUpdated, ...").
export class HealthGraphUpdatedEvent extends DomainEvent {
  readonly eventName = 'clinical.health-graph.updated';

  constructor(public readonly healthGraphId: string) {
    super();
  }
}
