import { DomainEvent } from '../../../../shared/domain/domain-event.js';

// Per docs/10-backend-architecture.md's ConsultationModule catalog entry
// ("Owned events: ... ConsultationStarted, ...").
export class ConsultationStartedEvent extends DomainEvent {
  readonly eventName = 'consultation.session.started';

  constructor(public readonly consultationSessionId: string) {
    super();
  }
}
