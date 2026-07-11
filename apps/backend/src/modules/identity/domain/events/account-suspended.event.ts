import { DomainEvent } from './domain-event.js';

// Per docs/10-backend-architecture.md's IdentityModule catalog entry
// ("Owned events (published): ..., AccountSuspended, ...").
export class AccountSuspendedEvent extends DomainEvent {
  readonly eventName = 'identity.account.suspended';

  constructor(public readonly accountId: string) {
    super();
  }
}
