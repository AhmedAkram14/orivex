import type { OAuthProviderClientPort, OAuthProviderRegistryPort } from '../../application/ports/oauth-provider.port.js';
import type { OAuthProvider } from '../../domain/enums/oauth-provider.enum.js';

export class OAuthProviderRegistry implements OAuthProviderRegistryPort {
  private readonly clients: Map<OAuthProvider, OAuthProviderClientPort>;

  constructor(clients: OAuthProviderClientPort[]) {
    this.clients = new Map(clients.map((client) => [client.provider, client]));
  }

  get(provider: OAuthProvider): OAuthProviderClientPort | null {
    return this.clients.get(provider) ?? null;
  }

  listConfigured(): OAuthProvider[] {
    return [...this.clients.keys()];
  }
}
