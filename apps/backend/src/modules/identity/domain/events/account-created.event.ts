import { DomainEvent } from '../../../../shared/domain/domain-event.js';

// Per docs/10-backend-architecture.md's IdentityModule catalog entry
// ("Owned events (published): AccountCreated, ...").
export class AccountCreatedEvent extends DomainEvent {
  readonly eventName = 'identity.account.created';

  constructor(
    public readonly accountId: string,
    public readonly email: string,
  ) {
    super();
  }
}
