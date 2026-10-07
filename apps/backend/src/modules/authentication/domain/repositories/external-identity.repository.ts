import type { ExternalIdentity } from '../entities/external-identity.entity.js';
import type { OAuthProvider } from '../enums/oauth-provider.enum.js';

export interface ExternalIdentityRepository {
  findByProviderSubject(provider: OAuthProvider, providerSubject: string): Promise<ExternalIdentity | null>;
  save(externalIdentity: ExternalIdentity): Promise<void>;
}
