import type { OAuthProvider } from '../../../domain/enums/oauth-provider.enum.js';
import type { OAuthProviderRegistryPort } from '../../ports/oauth-provider.port.js';

// Lets the frontend show only the Social Sign-In buttons that will actually
// work in this deployment (docs/14-adrs.md ADR-008).
export class ListOAuthProvidersUseCase {
  constructor(private readonly providerRegistry: OAuthProviderRegistryPort) {}

  execute(): OAuthProvider[] {
    return this.providerRegistry.listConfigured();
  }
}
