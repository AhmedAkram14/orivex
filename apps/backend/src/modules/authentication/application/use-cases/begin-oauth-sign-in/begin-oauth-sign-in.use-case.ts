import { OAuthProviderNotConfiguredError } from '../../../domain/exceptions/oauth-provider-not-configured.error.js';
import type { OAuthProviderRegistryPort } from '../../ports/oauth-provider.port.js';
import type { TokenGeneratorPort } from '../../ports/token-generator.port.js';

import type { BeginOAuthSignInCommand } from './begin-oauth-sign-in.command.js';

export interface BeginOAuthSignInResult {
  authorizationUrl: string;
  // Both must be kept by the caller (an httpOnly cookie -- see
  // OAuthController) and handed back to CompleteOAuthSignInUseCase: `state`
  // binds the callback to this browser (CSRF), `codeVerifier` is the PKCE
  // secret proving the same client that started the flow is finishing it.
  state: string;
  codeVerifier: string;
}

// Step 1 of Social Sign-In (docs/14-adrs.md ADR-008): mint the per-attempt
// secrets and the provider URL to send the browser to. Nothing is
// persisted -- the attempt only exists in the caller's cookie.
export class BeginOAuthSignInUseCase {
  constructor(
    private readonly providerRegistry: OAuthProviderRegistryPort,
    private readonly tokenGenerator: TokenGeneratorPort,
  ) {}

  execute(command: BeginOAuthSignInCommand): BeginOAuthSignInResult {
    const client = this.providerRegistry.get(command.provider);
    if (!client) {
      throw new OAuthProviderNotConfiguredError(command.provider);
    }

    // 32 random bytes, base64url: 43 characters, within PKCE's required
    // 43-128 unreserved-character range for a code verifier.
    const state = this.tokenGenerator.generate();
    const codeVerifier = this.tokenGenerator.generate();

    return { authorizationUrl: client.buildAuthorizationUrl({ state, codeVerifier }), state, codeVerifier };
  }
}
