import { DomainEvent } from '../../../../shared/domain/domain-event.js';

export class SessionCreatedEvent extends DomainEvent {
  readonly eventName = 'authentication.session.created';

  constructor(
    public readonly sessionId: string,
    public readonly credentialId: string,
  ) {
    super();
  }
}
