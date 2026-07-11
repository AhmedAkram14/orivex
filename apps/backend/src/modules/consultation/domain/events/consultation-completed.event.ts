import { DomainEvent } from '../../../../shared/domain/domain-event.js';

// Per docs/10-backend-architecture.md's ConsultationModule catalog entry
// ("Owned events: ... ConsultationCompleted, ...").
export class ConsultationCompletedEvent extends DomainEvent {
  readonly eventName = 'consultation.session.completed';

  constructor(public readonly consultationSessionId: string) {
    super();
  }
}
