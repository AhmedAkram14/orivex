import { DomainEvent } from '../../../../shared/domain/domain-event.js';

export class LoginFailedEvent extends DomainEvent {
  readonly eventName = 'authentication.login.failed';

  constructor(public readonly accountId: string) {
    super();
  }
}
