import { DomainEvent } from '../../../../shared/domain/domain-event.js';

// Raised by LoginUseCase (not Credential/Session -- the "is this a new
// device" comparison needs the account's other active sessions, which is an
// application-layer, not domain-entity, concern) when a successful login's
// device (by parsed displayName + IP) doesn't match any of the account's
// pre-existing active sessions. NotificationModule reacts to this by name
// only, same cross-module boundary as every other authentication.* event.
export class NewDeviceLoginDetectedEvent extends DomainEvent {
  readonly eventName = 'authentication.login.new-device-detected';

  constructor(
    public readonly accountId: string,
    public readonly displayName: string,
    public readonly city: string | undefined,
    public readonly country: string | undefined,
  ) {
    super();
  }
}
