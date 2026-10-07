import { DomainEvent } from '../../../../shared/domain/domain-event.js';
import type { OAuthProvider } from '../enums/oauth-provider.enum.js';

export class ExternalIdentityLinkedEvent extends DomainEvent {
  readonly eventName = 'authentication.external_identity.linked';

  constructor(
    public readonly credentialId: string,
    public readonly provider: OAuthProvider,
  ) {
    super();
  }
}
