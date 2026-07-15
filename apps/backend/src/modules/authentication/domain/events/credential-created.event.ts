import { DomainEvent } from '../../../../shared/domain/domain-event.js';

export class CredentialCreatedEvent extends DomainEvent {
  readonly eventName = 'authentication.credential.created';

  constructor(public readonly accountId: string) {
    super();
  }
}
