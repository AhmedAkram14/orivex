import { DomainEvent } from '../../../../shared/domain/domain-event.js';

export class AccountLockedEvent extends DomainEvent {
  readonly eventName = 'authentication.account.locked';

  constructor(
    public readonly accountId: string,
    public readonly lockedUntil: Date,
  ) {
    super();
  }
}
