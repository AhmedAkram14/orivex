import { AuthenticationDomainError } from './authentication-domain.error.js';

// Why a Social Sign-In attempt was refused. The value doubles as the
// `oauthError` query parameter the callback redirects to, so the frontend can
// show a precise message (apps/frontend features/auth OAUTH_ERROR_CODES).
export enum OAuthSignInFailureReason {
  // The provider returned no email address (a Facebook account registered by
  // phone, or the user declined the email permission) -- there is nothing to
  // create or match an account with.
  EmailMissing = 'email_missing',
  // An account with this email already exists, but the provider does not
  // assert the address is verified, so auto-linking would let anyone who
  // controls an unverified provider account take over the existing one.
  AccountExists = 'account_exists',
  // The provider rejected the code exchange, or its ID token failed
  // verification.
  ProviderRejected = 'provider_rejected',
}

export class OAuthSignInFailedError extends AuthenticationDomainError {
  constructor(public readonly reason: OAuthSignInFailureReason) {
    super(`Social sign-in failed: ${reason}.`);
  }
}
