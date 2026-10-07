import { createRemoteJWKSet, jwtVerify, type JWTVerifyGetKey } from 'jose';

import type { OAuthProfile, OAuthProviderClientPort } from '../../application/ports/oauth-provider.port.js';
import { OAuthProvider } from '../../domain/enums/oauth-provider.enum.js';
import { OAuthSignInFailedError, OAuthSignInFailureReason } from '../../domain/exceptions/oauth-sign-in-failed.error.js';

import { pkceS256Challenge } from './pkce.js';

const AUTHORIZATION_ENDPOINT = 'https://accounts.google.com/o/oauth2/v2/auth';
const TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token';
const JWKS_URI = 'https://www.googleapis.com/oauth2/v3/certs';
const ISSUERS = ['https://accounts.google.com', 'accounts.google.com'];

export interface GoogleOAuthClientConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

// Google as an OpenID Connect provider: authorization code + PKCE, then the
// ID token returned by the server-to-server code exchange is verified
// against Google's published signing keys (jose) -- issuer, audience and
// expiry included -- before any claim in it is trusted. `email_verified` is
// Google's own signed assertion, which is what allows linking to an
// existing ORIVEX account (docs/14-adrs.md ADR-008).
export class GoogleOAuthClient implements OAuthProviderClientPort {
  readonly provider = OAuthProvider.Google;
  // Created once per process: jose caches and rotates Google's keys itself.
  private readonly jwks: JWTVerifyGetKey;

  constructor(
    private readonly config: GoogleOAuthClientConfig,
    jwks?: JWTVerifyGetKey,
  ) {
    this.jwks = jwks ?? createRemoteJWKSet(new URL(JWKS_URI));
  }

  buildAuthorizationUrl(input: { state: string; codeVerifier: string }): string {
    const url = new URL(AUTHORIZATION_ENDPOINT);
    url.search = new URLSearchParams({
      client_id: this.config.clientId,
      redirect_uri: this.config.redirectUri,
      response_type: 'code',
      scope: 'openid email profile',
      state: input.state,
      code_challenge: pkceS256Challenge(input.codeVerifier),
      code_challenge_method: 'S256',
      // Always let the person pick which Google account -- otherwise a
      // shared/family computer silently signs in whoever is logged in.
      prompt: 'select_account',
    }).toString();
    return url.toString();
  }

  async exchangeCode(input: { code: string; codeVerifier: string }): Promise<OAuthProfile> {
    const response = await fetch(TOKEN_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code: input.code,
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
        redirect_uri: this.config.redirectUri,
        grant_type: 'authorization_code',
        code_verifier: input.codeVerifier,
      }),
    });
    if (!response.ok) {
      throw new OAuthSignInFailedError(OAuthSignInFailureReason.ProviderRejected);
    }

    const body = (await response.json()) as { id_token?: unknown };
    if (typeof body.id_token !== 'string') {
      throw new OAuthSignInFailedError(OAuthSignInFailureReason.ProviderRejected);
    }

    let claims: Record<string, unknown>;
    try {
      ({ payload: claims } = await jwtVerify(body.id_token, this.jwks, {
        issuer: ISSUERS,
        audience: this.config.clientId,
      }));
    } catch {
      throw new OAuthSignInFailedError(OAuthSignInFailureReason.ProviderRejected);
    }

    if (typeof claims.sub !== 'string' || claims.sub.length === 0) {
      throw new OAuthSignInFailedError(OAuthSignInFailureReason.ProviderRejected);
    }

    return {
      provider: this.provider,
      subject: claims.sub,
      email: typeof claims.email === 'string' ? claims.email : undefined,
      emailVerified: claims.email_verified === true,
      displayName: typeof claims.name === 'string' ? claims.name : undefined,
    };
  }
}
