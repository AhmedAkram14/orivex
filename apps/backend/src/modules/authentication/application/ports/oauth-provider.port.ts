import type { OAuthProvider } from '../../domain/enums/oauth-provider.enum.js';

// What a provider tells us about the person who just signed in with it.
// `subject` is the provider's stable user id (Google `sub`, Facebook `id`) --
// the only value an ExternalIdentity is ever matched on.
export interface OAuthProfile {
  provider: OAuthProvider;
  subject: string;
  email?: string;
  // True only when the provider itself asserts the address is verified
  // (Google's signed `email_verified` claim). Facebook makes no such
  // assertion, so its adapter always reports false (docs/14-adrs.md ADR-008).
  emailVerified: boolean;
  displayName?: string;
}

// One OAuth 2.0 authorization-code client per provider (docs/14-adrs.md
// ADR-008). Infra binds google-oauth-client.ts / facebook-oauth-client.ts;
// the redirect URI and client secrets are the adapter's own configuration,
// never something the application layer handles.
export interface OAuthProviderClientPort {
  readonly provider: OAuthProvider;
  // `codeVerifier` is the PKCE secret; a provider that supports PKCE
  // (Google) derives the S256 challenge from it, one that doesn't
  // (Facebook's manual flow) ignores it and relies on its client secret.
  buildAuthorizationUrl(input: { state: string; codeVerifier: string }): string;
  // Exchanges the callback's authorization code server-to-server and
  // returns the verified profile. Throws OAuthSignInFailedError
  // (ProviderRejected) on any provider-side failure.
  exchangeCode(input: { code: string; codeVerifier: string }): Promise<OAuthProfile>;
}

// Only providers whose client id/secret are configured are present --
// same not-configured idiom as every other optional provider in
// env.schema.ts: an unconfigured provider simply isn't offered.
export interface OAuthProviderRegistryPort {
  get(provider: OAuthProvider): OAuthProviderClientPort | null;
  listConfigured(): OAuthProvider[];
}
