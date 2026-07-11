import { DomainEvent } from '../../../../shared/domain/domain-event.js';

// Per docs/10-backend-architecture.md's ConsultationModule catalog entry
// ("Owned events: ... ConsultationInterrupted, ...").
export class ConsultationInterruptedEvent extends DomainEvent {
  readonly eventName = 'consultation.session.interrupted';

  constructor(public readonly consultationSessionId: string) {
    super();
  }
}
