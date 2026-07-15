import { DomainEvent } from '../../../../shared/domain/domain-event.js';

export class SessionRevokedEvent extends DomainEvent {
  readonly eventName = 'authentication.session.revoked';

  constructor(
    public readonly sessionId: string,
    public readonly credentialId: string,
  ) {
    super();
  }
}
