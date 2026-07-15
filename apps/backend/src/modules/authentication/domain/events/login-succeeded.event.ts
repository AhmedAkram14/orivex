import { DomainEvent } from '../../../../shared/domain/domain-event.js';

export class LoginSucceededEvent extends DomainEvent {
  readonly eventName = 'authentication.login.succeeded';

  constructor(public readonly accountId: string) {
    super();
  }
}
