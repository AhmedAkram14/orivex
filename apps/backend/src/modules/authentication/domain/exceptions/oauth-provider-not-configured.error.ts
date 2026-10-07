import { AuthenticationDomainError } from './authentication-domain.error.js';

export class OAuthProviderNotConfiguredError extends AuthenticationDomainError {
  constructor(public readonly provider: string) {
    super(`Social sign-in provider "${provider}" is not available.`);
  }
}
