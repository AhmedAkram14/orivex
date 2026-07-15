import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Throttle } from '@nestjs/throttler';
import type { CookieOptions, Request, Response } from 'express';

import type { EnvConfig } from '../../../../core/configuration/env.schema.js';
import { envelope, type ResponseEnvelope } from '../../../../shared/http/response-envelope.js';
import type { AccessTokenClaims, JwtSignerPort } from '../../application/ports/jwt-signer.port.js';
import { JWT_SIGNER } from '../../application/ports/tokens.js';
import { ChangePasswordCommand } from '../../application/use-cases/change-password/change-password.command.js';
import { ChangePasswordUseCase } from '../../application/use-cases/change-password/change-password.use-case.js';
import { ForgotPasswordCommand } from '../../application/use-cases/forgot-password/forgot-password.command.js';
import { ForgotPasswordUseCase } from '../../application/use-cases/forgot-password/forgot-password.use-case.js';
import { GetCurrentSessionUseCase } from '../../application/use-cases/get-current-session/get-current-session.use-case.js';
import { LoginCommand } from '../../application/use-cases/login/login.command.js';
import { LoginUseCase } from '../../application/use-cases/login/login.use-case.js';
import { LogoutCommand } from '../../application/use-cases/logout/logout.command.js';
import { LogoutUseCase } from '../../application/use-cases/logout/logout.use-case.js';
import { RefreshSessionCommand } from '../../application/use-cases/refresh-session/refresh-session.command.js';
import { RefreshSessionUseCase } from '../../application/use-cases/refresh-session/refresh-session.use-case.js';
import { RegisterCommand } from '../../application/use-cases/register/register.command.js';
import { RegisterUseCase } from '../../application/use-cases/register/register.use-case.js';
import { ResetPasswordCommand } from '../../application/use-cases/reset-password/reset-password.command.js';
import { ResetPasswordUseCase } from '../../application/use-cases/reset-password/reset-password.use-case.js';
import { VerifyEmailCommand } from '../../application/use-cases/verify-email/verify-email.command.js';
import { VerifyEmailUseCase } from '../../application/use-cases/verify-email/verify-email.use-case.js';
import { TokenInvalidError } from '../../domain/exceptions/token-invalid.error.js';
import { CurrentUser } from '../decorators/current-user.decorator.js';
import { AuthenticatedUserDto } from '../dto/authenticated-user.dto.js';
import { ChangePasswordRequestDto } from '../dto/change-password-request.dto.js';
import { ChangePasswordResponseDto } from '../dto/change-password-response.dto.js';
import { ForgotPasswordRequestDto } from '../dto/forgot-password-request.dto.js';
import { ForgotPasswordResponseDto } from '../dto/forgot-password-response.dto.js';
import { LoginRequestDto } from '../dto/login-request.dto.js';
import { LoginResponseDto } from '../dto/login-response.dto.js';
import { MeResponseDto } from '../dto/me-response.dto.js';
import { RefreshResponseDto } from '../dto/refresh-response.dto.js';
import { RegisterRequestDto } from '../dto/register-request.dto.js';
import { RegisterResponseDto } from '../dto/register-response.dto.js';
import { ResetPasswordRequestDto } from '../dto/reset-password-request.dto.js';
import { ResetPasswordResponseDto } from '../dto/reset-password-response.dto.js';
import { VerifyEmailRequestDto } from '../dto/verify-email-request.dto.js';
import { VerifyEmailResponseDto } from '../dto/verify-email-response.dto.js';
import { JwtAuthGuard } from '../guards/jwt-auth.guard.js';
import { mapAuthenticationError } from '../mappers/authentication-exception.mapper.js';

const REFRESH_COOKIE_NAME = 'orivex_refresh_token';
const REFRESH_COOKIE_PATH = '/auth';

// Express's Request type isn't augmented with `cookies` here without
// importing cookie-parser's global type side-effects; typed locally instead
// so this file doesn't depend on that augmentation existing.
type RequestWithCookies = Request & { cookies?: Record<string, string> };

@Controller('auth')
export class AuthenticationController {
  constructor(
    private readonly registerUseCase: RegisterUseCase,
    private readonly loginUseCase: LoginUseCase,
    private readonly logoutUseCase: LogoutUseCase,
    private readonly refreshSessionUseCase: RefreshSessionUseCase,
    private readonly forgotPasswordUseCase: ForgotPasswordUseCase,
    private readonly resetPasswordUseCase: ResetPasswordUseCase,
    private readonly verifyEmailUseCase: VerifyEmailUseCase,
    private readonly changePasswordUseCase: ChangePasswordUseCase,
    private readonly getCurrentSessionUseCase: GetCurrentSessionUseCase,
    @Inject(JWT_SIGNER) private readonly jwtSigner: JwtSignerPort,
    private readonly configService: ConfigService<EnvConfig, true>,
  ) {}

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  async register(@Body() body: RegisterRequestDto): Promise<ResponseEnvelope<RegisterResponseDto>> {
    try {
      const result = await this.registerUseCase.execute(
        new RegisterCommand({ fullName: body.fullName, email: body.email, password: body.password }),
      );
      const dto = new RegisterResponseDto();
      dto.email = result.email;
      return envelope(dto);
    } catch (error) {
      throw mapAuthenticationError(error);
    }
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  async login(
    @Body() body: LoginRequestDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<ResponseEnvelope<LoginResponseDto>> {
    try {
      const result = await this.loginUseCase.execute(
        new LoginCommand({
          email: body.email,
          password: body.password,
          ipAddress: request.ip,
          userAgent: request.headers['user-agent'],
        }),
      );

      this.setRefreshCookie(response, result.refreshToken, result.refreshTokenExpiresAt);

      const dto = new LoginResponseDto();
      dto.user = AuthenticatedUserDto.fromAccount(result.account);
      dto.accessToken = result.accessToken;
      dto.accessTokenExpiresAt = result.accessTokenExpiresAt.toISOString();
      return envelope(dto);
    } catch (error) {
      throw mapAuthenticationError(error);
    }
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(
    @Req() request: RequestWithCookies,
    @Res({ passthrough: true }) response: Response,
  ): Promise<void> {
    const refreshToken = this.readRefreshCookie(request);
    await this.logoutUseCase.execute(new LogoutCommand({ refreshToken }));
    this.clearRefreshCookie(response);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Req() request: RequestWithCookies,
    @Res({ passthrough: true }) response: Response,
  ): Promise<ResponseEnvelope<RefreshResponseDto>> {
    const refreshToken = this.readRefreshCookie(request);
    if (!refreshToken) {
      throw mapAuthenticationError(new TokenInvalidError());
    }

    try {
      const result = await this.refreshSessionUseCase.execute(new RefreshSessionCommand({ refreshToken }));
      this.setRefreshCookie(response, result.refreshToken, result.refreshTokenExpiresAt);

      const dto = new RefreshResponseDto();
      dto.accessToken = result.accessToken;
      dto.accessTokenExpiresAt = result.accessTokenExpiresAt.toISOString();
      return envelope(dto);
    } catch (error) {
      this.clearRefreshCookie(response);
      throw mapAuthenticationError(error);
    }
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  async forgotPassword(
    @Body() body: ForgotPasswordRequestDto,
  ): Promise<ResponseEnvelope<ForgotPasswordResponseDto>> {
    await this.forgotPasswordUseCase.execute(new ForgotPasswordCommand({ email: body.email }));
    return envelope(new ForgotPasswordResponseDto());
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  async resetPassword(
    @Body() body: ResetPasswordRequestDto,
  ): Promise<ResponseEnvelope<ResetPasswordResponseDto>> {
    try {
      await this.resetPasswordUseCase.execute(
        new ResetPasswordCommand({ token: body.token, password: body.password }),
      );
      return envelope(new ResetPasswordResponseDto());
    } catch (error) {
      throw mapAuthenticationError(error);
    }
  }

  @Post('verify-email')
  @HttpCode(HttpStatus.OK)
  async verifyEmail(@Body() body: VerifyEmailRequestDto): Promise<ResponseEnvelope<VerifyEmailResponseDto>> {
    try {
      await this.verifyEmailUseCase.execute(new VerifyEmailCommand({ token: body.token }));
      return envelope(new VerifyEmailResponseDto());
    } catch (error) {
      throw mapAuthenticationError(error);
    }
  }

  @Post('change-password')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  async changePassword(
    @Body() body: ChangePasswordRequestDto,
    @CurrentUser() user: AccessTokenClaims,
    @Req() request: RequestWithCookies,
  ): Promise<ResponseEnvelope<ChangePasswordResponseDto>> {
    try {
      const currentRefreshToken = this.readRefreshCookie(request);
      await this.changePasswordUseCase.execute(
        new ChangePasswordCommand({
          accountId: user.accountId,
          currentPassword: body.currentPassword,
          newPassword: body.newPassword,
          currentRefreshToken,
        }),
      );
      return envelope(new ChangePasswordResponseDto());
    } catch (error) {
      throw mapAuthenticationError(error);
    }
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async me(@CurrentUser() user: AccessTokenClaims): Promise<ResponseEnvelope<MeResponseDto>> {
    const account = await this.getCurrentSessionUseCase.execute({ accountId: user.accountId });
    if (!account) {
      // Should not happen in practice: a validly-signed JWT implies the
      // account existed at issuance. Surfaced as an invalid token, not a
      // 500, in case the account was deleted after the token was issued.
      throw mapAuthenticationError(new TokenInvalidError());
    }
    const dto = new MeResponseDto();
    dto.user = AuthenticatedUserDto.fromAccount(account);
    return envelope(dto);
  }

  // Thin alias backing the frontend's existing session-bootstrap flow
  // (GET /auth/session), which expects `{ user } | null` and never a 401 for
  // an absent/expired token -- unlike GET /auth/me, this endpoint never
  // throws for an unauthenticated caller.
  @Get('session')
  async session(@Req() request: Request): Promise<ResponseEnvelope<MeResponseDto | null>> {
    const token = this.extractBearerToken(request);
    if (!token) {
      return envelope(null);
    }

    try {
      const claims = await this.jwtSigner.verify(token);
      const account = await this.getCurrentSessionUseCase.execute({ accountId: claims.accountId });
      if (!account) {
        return envelope(null);
      }
      const dto = new MeResponseDto();
      dto.user = AuthenticatedUserDto.fromAccount(account);
      return envelope(dto);
    } catch {
      return envelope(null);
    }
  }

  private extractBearerToken(request: Request): string | undefined {
    const header = request.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
      return undefined;
    }
    return header.slice('Bearer '.length);
  }

  private readRefreshCookie(request: RequestWithCookies): string | undefined {
    return request.cookies?.[REFRESH_COOKIE_NAME];
  }

  private setRefreshCookie(response: Response, token: string, expiresAt: Date): void {
    response.cookie(REFRESH_COOKIE_NAME, token, { ...this.cookieOptions(), expires: expiresAt });
  }

  private clearRefreshCookie(response: Response): void {
    response.clearCookie(REFRESH_COOKIE_NAME, this.cookieOptions());
  }

  // Cross-site in production (frontend and backend are on different eTLD+1
  // domains): SameSite=None requires Secure=true, which in turn requires
  // HTTPS -- unavailable in local dev over plain http, so dev uses the
  // same-site-compatible Lax/non-Secure combination instead.
  private cookieOptions(): CookieOptions {
    const isProduction = this.configService.get('NODE_ENV', { infer: true }) === 'production';
    return {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'none' : 'lax',
      path: REFRESH_COOKIE_PATH,
    };
  }
}
