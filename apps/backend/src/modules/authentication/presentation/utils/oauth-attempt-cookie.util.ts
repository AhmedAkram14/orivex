import { ConfigService } from '@nestjs/config';
import type { CookieOptions, Response } from 'express';

import type { EnvConfig } from '../../../../core/configuration/env.schema.js';
import { parseOAuthProvider, type OAuthProvider } from '../../domain/enums/oauth-provider.enum.js';

import type { RequestWithCookies } from './refresh-cookie.util.js';

export const OAUTH_ATTEMPT_COOKIE_NAME = 'orivex_oauth_attempt';
// Scoped to the two OAuth routes only -- never sent anywhere else.
const OAUTH_ATTEMPT_COOKIE_PATH = '/auth/oauth';
const OAUTH_ATTEMPT_TTL_MS = 10 * 60_000;

export type OAuthLocale = 'en' | 'ar';

// One in-flight Social Sign-In attempt (docs/14-adrs.md ADR-008), held by
// the browser between /start and /callback. httpOnly, so page script can
// never read the PKCE verifier. Not signed: only this backend's own origin
// can set a cookie for it, and every field is re-validated on read anyway.
export interface OAuthAttempt {
  provider: OAuthProvider;
  state: string;
  codeVerifier: string;
  returnTo?: string;
  locale: OAuthLocale;
}

// SameSite=Lax, not the refresh cookie's None: the provider sends the
// browser back with a top-level GET navigation, which Lax cookies ride on,
// and nothing else ever needs this cookie cross-site.
function attemptCookieOptions(configService: ConfigService<EnvConfig, true>): CookieOptions {
  return {
    httpOnly: true,
    secure: configService.get('NODE_ENV', { infer: true }) === 'production',
    sameSite: 'lax',
    path: OAUTH_ATTEMPT_COOKIE_PATH,
  };
}

export function setOAuthAttemptCookie(
  configService: ConfigService<EnvConfig, true>,
  response: Response,
  attempt: OAuthAttempt,
): void {
  const value = Buffer.from(JSON.stringify(attempt), 'utf8').toString('base64url');
  response.cookie(OAUTH_ATTEMPT_COOKIE_NAME, value, {
    ...attemptCookieOptions(configService),
    maxAge: OAUTH_ATTEMPT_TTL_MS,
  });
}

export function clearOAuthAttemptCookie(configService: ConfigService<EnvConfig, true>, response: Response): void {
  response.clearCookie(OAUTH_ATTEMPT_COOKIE_NAME, attemptCookieOptions(configService));
}

export function readOAuthAttemptCookie(request: RequestWithCookies): OAuthAttempt | null {
  const raw = request.cookies?.[OAUTH_ATTEMPT_COOKIE_NAME];
  if (!raw) {
    return null;
  }
  try {
    const parsed = JSON.parse(Buffer.from(raw, 'base64url').toString('utf8')) as Record<string, unknown>;
    const provider = typeof parsed.provider === 'string' ? parseOAuthProvider(parsed.provider) : null;
    if (!provider || typeof parsed.state !== 'string' || typeof parsed.codeVerifier !== 'string') {
      return null;
    }
    return {
      provider,
      state: parsed.state,
      codeVerifier: parsed.codeVerifier,
      returnTo: typeof parsed.returnTo === 'string' ? safeReturnTo(parsed.returnTo) : undefined,
      locale: parseOAuthLocale(parsed.locale),
    };
  } catch {
    return null;
  }
}

export function parseOAuthLocale(value: unknown): OAuthLocale {
  return value === 'ar' ? 'ar' : 'en';
}

// Same rule as the frontend's own safeReturnTo (shared/auth/return-to.ts):
// a same-site relative path only -- never `//evil.example` or `/\evil`,
// which browsers treat as protocol-relative. Anything else is dropped, so
// the callback can never become an open redirect.
export function safeReturnTo(value: string | undefined): string | undefined {
  if (!value || !value.startsWith('/') || value.startsWith('//') || value.startsWith('/\\')) {
    return undefined;
  }
  return value;
}
