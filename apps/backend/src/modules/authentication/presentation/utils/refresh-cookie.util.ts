import { ConfigService } from '@nestjs/config';
import type { CookieOptions, Request, Response } from 'express';

import type { EnvConfig } from '../../../../core/configuration/env.schema.js';

export const REFRESH_COOKIE_NAME = 'orivex_refresh_token';
export const REFRESH_COOKIE_PATH = '/auth';

// Express's Request type isn't augmented with `cookies` here without
// importing cookie-parser's global type side-effects; typed locally instead
// so this file doesn't depend on that augmentation existing.
export type RequestWithCookies = Request & { cookies?: Record<string, string> };

export function readRefreshCookie(request: RequestWithCookies): string | undefined {
  return request.cookies?.[REFRESH_COOKIE_NAME];
}

// Cross-site in production (frontend and backend are on different eTLD+1
// domains): SameSite=None requires Secure=true, which in turn requires
// HTTPS -- unavailable in local dev over plain http, so dev uses the
// same-site-compatible Lax/non-Secure combination instead.
export function refreshCookieOptions(configService: ConfigService<EnvConfig, true>): CookieOptions {
  const isProduction = configService.get('NODE_ENV', { infer: true }) === 'production';
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'none' : 'lax',
    path: REFRESH_COOKIE_PATH,
  };
}

export function setRefreshCookie(
  configService: ConfigService<EnvConfig, true>,
  response: Response,
  token: string,
  expiresAt: Date,
): void {
  response.cookie(REFRESH_COOKIE_NAME, token, { ...refreshCookieOptions(configService), expires: expiresAt });
}

export function clearRefreshCookie(configService: ConfigService<EnvConfig, true>, response: Response): void {
  response.clearCookie(REFRESH_COOKIE_NAME, refreshCookieOptions(configService));
}
