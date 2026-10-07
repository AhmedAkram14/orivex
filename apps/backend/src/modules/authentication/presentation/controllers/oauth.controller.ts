import { Controller, Get, HttpCode, HttpStatus, Param, Query, Req, Res } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';

import type { EnvConfig } from '../../../../core/configuration/env.schema.js';
import { getClientIp } from '../../../../platform/http/get-client-ip.js';
import { PinoLoggerService } from '../../../../platform/logging/pino-logger.service.js';
import { ConflictError } from '../../../../shared/errors/app-error.js';
import { envelope, type ResponseEnvelope } from '../../../../shared/http/response-envelope.js';
import { Language } from '../../../identity/domain/enums/language.enum.js';
import { BeginOAuthSignInCommand } from '../../application/use-cases/begin-oauth-sign-in/begin-oauth-sign-in.command.js';
import { BeginOAuthSignInUseCase } from '../../application/use-cases/begin-oauth-sign-in/begin-oauth-sign-in.use-case.js';
import { CompleteOAuthSignInCommand } from '../../application/use-cases/complete-oauth-sign-in/complete-oauth-sign-in.command.js';
import { CompleteOAuthSignInUseCase } from '../../application/use-cases/complete-oauth-sign-in/complete-oauth-sign-in.use-case.js';
import { ListOAuthProvidersUseCase } from '../../application/use-cases/list-oauth-providers/list-oauth-providers.use-case.js';
import { parseOAuthProvider } from '../../domain/enums/oauth-provider.enum.js';
import { AccountLockedError } from '../../domain/exceptions/account-locked.error.js';
import { EmailNotVerifiedError } from '../../domain/exceptions/email-not-verified.error.js';
import { OAuthProviderNotConfiguredError } from '../../domain/exceptions/oauth-provider-not-configured.error.js';
import { OAuthSignInFailedError } from '../../domain/exceptions/oauth-sign-in-failed.error.js';
import { OAuthProvidersResponseDto } from '../dto/oauth-providers-response.dto.js';
import {
  clearOAuthAttemptCookie,
  parseOAuthLocale,
  readOAuthAttemptCookie,
  safeReturnTo,
  setOAuthAttemptCookie,
  type OAuthLocale,
} from '../utils/oauth-attempt-cookie.util.js';
import { setRefreshCookie, type RequestWithCookies } from '../utils/refresh-cookie.util.js';

// The `error` values the frontend's /oauth-callback page understands
// (apps/frontend features/auth/api/types.ts OAUTH_ERROR_CODES). Domain
// OAuthSignInFailureReason values pass through unchanged.
const OAUTH_ERROR = {
  cancelled: 'cancelled',
  invalidState: 'invalid_state',
  providerUnavailable: 'provider_unavailable',
  accountLocked: 'account_locked',
  emailNotVerified: 'email_not_verified',
  accountExists: 'account_exists',
  failed: 'failed',
} as const;

const LOCALE_TO_LANGUAGE: Record<OAuthLocale, Language> = { en: Language.English, ar: Language.Arabic };

// Social Sign-In (docs/14-adrs.md ADR-008) -- browser-navigation endpoints,
// not JSON APIs: /start and /callback answer with 302 redirects, never an
// envelope, because the browser itself (not frontend fetch code) walks
// through them. The session is handed over exactly like /auth/login does
// it -- the httpOnly refresh cookie -- and the frontend then obtains its
// access token through the existing /auth/refresh. No token ever appears
// in a URL.
@Controller('auth/oauth')
export class OAuthController {
  constructor(
    private readonly beginOAuthSignInUseCase: BeginOAuthSignInUseCase,
    private readonly completeOAuthSignInUseCase: CompleteOAuthSignInUseCase,
    private readonly listOAuthProvidersUseCase: ListOAuthProvidersUseCase,
    private readonly configService: ConfigService<EnvConfig, true>,
    private readonly logger: PinoLoggerService,
  ) {}

  @Get('providers')
  @HttpCode(HttpStatus.OK)
  providers(): ResponseEnvelope<OAuthProvidersResponseDto> {
    const dto = new OAuthProvidersResponseDto();
    dto.providers = this.listOAuthProvidersUseCase.execute();
    return envelope(dto);
  }

  @Get(':provider/start')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  start(
    @Param('provider') providerParam: string,
    @Query('returnTo') returnTo: string | undefined,
    @Query('locale') localeParam: string | undefined,
    @Res() response: Response,
  ): void {
    const locale = parseOAuthLocale(localeParam);
    const provider = parseOAuthProvider(providerParam);
    if (!provider) {
      this.redirectToFrontend(response, locale, '/oauth-callback', { error: OAUTH_ERROR.providerUnavailable });
      return;
    }

    try {
      const attempt = this.beginOAuthSignInUseCase.execute(new BeginOAuthSignInCommand({ provider }));
      setOAuthAttemptCookie(this.configService, response, {
        provider,
        state: attempt.state,
        codeVerifier: attempt.codeVerifier,
        returnTo: safeReturnTo(returnTo),
        locale,
      });
      response.redirect(HttpStatus.FOUND, attempt.authorizationUrl);
    } catch (error) {
      this.redirectToFrontend(response, locale, '/oauth-callback', { error: this.toErrorCode(error) });
    }
  }

  @Get(':provider/callback')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  async callback(
    @Param('provider') providerParam: string,
    @Query('code') code: string | undefined,
    @Query('state') state: string | undefined,
    @Query('error') providerError: string | undefined,
    @Req() request: Request & RequestWithCookies,
    @Res() response: Response,
  ): Promise<void> {
    const attempt = readOAuthAttemptCookie(request);
    const locale = attempt?.locale ?? 'en';

    // Google/Facebook send `error` (e.g. access_denied) when the person
    // backs out of the consent screen -- a normal outcome, not a failure.
    if (providerError) {
      this.failAttempt(response, locale, OAUTH_ERROR.cancelled);
      return;
    }

    // The CSRF check: the callback must belong to an attempt this same
    // browser started, for this same provider.
    if (!attempt || !code || !state || attempt.state !== state || attempt.provider !== parseOAuthProvider(providerParam)) {
      this.failAttempt(response, locale, OAUTH_ERROR.invalidState);
      return;
    }

    try {
      const result = await this.completeOAuthSignInUseCase.execute(
        new CompleteOAuthSignInCommand({
          provider: attempt.provider,
          code,
          codeVerifier: attempt.codeVerifier,
          preferredLanguage: LOCALE_TO_LANGUAGE[locale],
          ipAddress: getClientIp(request),
          userAgent: request.headers['user-agent'],
        }),
      );

      if (result.status === 'verification_required') {
        clearOAuthAttemptCookie(this.configService, response);
        this.redirectToFrontend(response, locale, '/check-email', { email: result.email, reason: 'register' });
        return;
      }

      // Exactly ONE Set-Cookie on success -- the refresh cookie -- and the
      // attempt cookie deliberately left to expire on its own (10 min).
      // This response reaches the browser through the frontend's /auth/*
      // proxy, and a second Set-Cookie (the attempt-cookie clear) cost us
      // the refresh cookie in production: the browser never received it
      // and the first /auth/refresh found no cookie at all. Leaving the
      // attempt cookie is harmless -- its state/verifier are useless
      // without a fresh provider code, which is single-use, and the next
      // /start overwrites it.
      setRefreshCookie(this.configService, response, result.refreshToken, result.refreshTokenExpiresAt);
      this.redirectToFrontend(response, locale, '/oauth-callback', attempt.returnTo ? { returnTo: attempt.returnTo } : {});
    } catch (error) {
      this.failAttempt(response, locale, this.toErrorCode(error));
    }
  }

  // Every non-success outcome: drop the attempt cookie (the only cookie on
  // these responses) and send the browser back with the reason.
  private failAttempt(response: Response, locale: OAuthLocale, errorCode: string): void {
    clearOAuthAttemptCookie(this.configService, response);
    this.redirectToFrontend(response, locale, '/oauth-callback', { error: errorCode });
  }

  private toErrorCode(error: unknown): string {
    if (error instanceof OAuthSignInFailedError) return error.reason;
    if (error instanceof OAuthProviderNotConfiguredError) return OAUTH_ERROR.providerUnavailable;
    if (error instanceof AccountLockedError) return OAUTH_ERROR.accountLocked;
    if (error instanceof EmailNotVerifiedError) return OAUTH_ERROR.emailNotVerified;
    // Identity's RegisterAccountUseCase losing a same-email race.
    if (error instanceof ConflictError) return OAUTH_ERROR.accountExists;
    this.logger.error('Social sign-in failed unexpectedly', error instanceof Error ? error.stack : String(error), 'OAuthController');
    return OAUTH_ERROR.failed;
  }

  // FRONTEND_URL is guaranteed whenever any provider is configured
  // (authentication.module.ts builds no provider without it); the
  // fallback only matters for the unknown-provider/unconfigured path.
  private redirectToFrontend(response: Response, locale: OAuthLocale, path: string, params: Record<string, string>): void {
    const frontendUrl = this.configService.get('FRONTEND_URL', { infer: true }) ?? 'http://localhost:3000';
    const url = new URL(`/${locale}${path}`, frontendUrl);
    url.search = new URLSearchParams(params).toString();
    response.redirect(HttpStatus.FOUND, url.toString());
  }
}
