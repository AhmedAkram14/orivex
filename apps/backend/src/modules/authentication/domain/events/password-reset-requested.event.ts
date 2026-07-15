import { DomainEvent } from '../../../../shared/domain/domain-event.js';

export class PasswordResetRequestedEvent extends DomainEvent {
  readonly eventName = 'authentication.password.reset-requested';

  constructor(public readonly accountId: string) {
    super();
  }
}
