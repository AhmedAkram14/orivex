import { DomainEvent } from '../../../../shared/domain/domain-event.js';

export class PasswordChangedEvent extends DomainEvent {
  readonly eventName = 'authentication.password.changed';

  constructor(public readonly accountId: string) {
    super();
  }
}
