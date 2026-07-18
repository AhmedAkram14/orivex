import { Controller, Delete, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Post, Req, Res, UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Response } from 'express';

import type { EnvConfig } from '../../../../core/configuration/env.schema.js';
import { NotFoundError, ValidationError } from '../../../../shared/errors/app-error.js';
import { envelope, type ResponseEnvelope } from '../../../../shared/http/response-envelope.js';
import type { AccessTokenClaims } from '../../application/ports/jwt-signer.port.js';
import { ListDeviceSessionsUseCase } from '../../application/use-cases/list-device-sessions/list-device-sessions.use-case.js';
import { LogoutAllSessionsCommand } from '../../application/use-cases/logout-all-sessions/logout-all-sessions.command.js';
import { LogoutAllSessionsUseCase } from '../../application/use-cases/logout-all-sessions/logout-all-sessions.use-case.js';
import { RevokeDeviceSessionCommand } from '../../application/use-cases/revoke-device-session/revoke-device-session.command.js';
import { RevokeDeviceSessionUseCase } from '../../application/use-cases/revoke-device-session/revoke-device-session.use-case.js';
import { TokenInvalidError } from '../../domain/exceptions/token-invalid.error.js';
import { CurrentUser } from '../decorators/current-user.decorator.js';
import { DeviceSessionResponseDto } from '../dto/device-session-response.dto.js';
import { JwtAuthGuard } from '../guards/jwt-auth.guard.js';
import { mapAuthenticationError } from '../mappers/authentication-exception.mapper.js';
import { clearRefreshCookie, readRefreshCookie, type RequestWithCookies } from '../utils/refresh-cookie.util.js';

// Split out of AuthenticationController (Production Readiness Audit --
// "split oversized controllers") -- device-session management is a
// self-contained slice of /auth with its own three routes, distinct from
// the core credential-flow endpoints (register/login/refresh/etc) that
// remain on AuthenticationController. Same `auth` path prefix, so the
// public contract (GET/DELETE /auth/sessions, POST /auth/logout-all) is
// unchanged.
@Controller('auth')
export class DeviceSessionsController {
  constructor(
    private readonly listDeviceSessionsUseCase: ListDeviceSessionsUseCase,
    private readonly revokeDeviceSessionUseCase: RevokeDeviceSessionUseCase,
    private readonly logoutAllSessionsUseCase: LogoutAllSessionsUseCase,
    private readonly configService: ConfigService<EnvConfig, true>,
  ) {}

  @Get('sessions')
  @UseGuards(JwtAuthGuard)
  async listSessions(
    @CurrentUser() user: AccessTokenClaims,
    @Req() request: RequestWithCookies,
  ): Promise<ResponseEnvelope<DeviceSessionResponseDto[]>> {
    const currentRefreshToken = readRefreshCookie(request);
    const items = await this.listDeviceSessionsUseCase.execute({
      accountId: user.accountId,
      currentRefreshToken,
    });
    if (!items) {
      // No credential for this account -- should not happen for a validly
      // signed JWT, same reasoning as AuthenticationController.me()'s
      // TokenInvalidError fallback.
      throw mapAuthenticationError(new TokenInvalidError());
    }
    return envelope(items.map((item) => DeviceSessionResponseDto.fromDomain(item.session, item.isCurrent)));
  }

  @Delete('sessions/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtAuthGuard)
  async revokeSession(
    @CurrentUser() user: AccessTokenClaims,
    @Param('id', ParseUUIDPipe) id: string,
    @Req() request: RequestWithCookies,
  ): Promise<void> {
    const currentRefreshToken = readRefreshCookie(request);
    const result = await this.revokeDeviceSessionUseCase.execute(
      new RevokeDeviceSessionCommand({ accountId: user.accountId, sessionId: id, currentRefreshToken }),
    );

    if (result === 'not_found') {
      throw new NotFoundError(`Session "${id}" not found.`);
    }
    if (result === 'cannot_revoke_current') {
      throw new ValidationError('Cannot revoke your current session; use logout instead.');
    }
  }

  @Post('logout-all')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtAuthGuard)
  async logoutAll(
    @CurrentUser() user: AccessTokenClaims,
    @Res({ passthrough: true }) response: Response,
  ): Promise<void> {
    const result = await this.logoutAllSessionsUseCase.execute(new LogoutAllSessionsCommand({ accountId: user.accountId }));
    if (result === 'not_found') {
      throw mapAuthenticationError(new TokenInvalidError());
    }
    // The caller's own session was revoked too -- clear their refresh
    // cookie, same helper AuthenticationController.logout() uses.
    clearRefreshCookie(this.configService, response);
  }
}
