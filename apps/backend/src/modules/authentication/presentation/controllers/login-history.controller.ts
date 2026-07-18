import { Controller, Get, UseGuards } from '@nestjs/common';

import { envelope, type ResponseEnvelope } from '../../../../shared/http/response-envelope.js';
import type { AccessTokenClaims } from '../../application/ports/jwt-signer.port.js';
import { ListLoginHistoryForAccountUseCase } from '../../application/use-cases/list-login-history-for-account/list-login-history-for-account.use-case.js';
import { CurrentUser } from '../decorators/current-user.decorator.js';
import { LoginHistoryEntryResponseDto } from '../dto/login-history-entry-response.dto.js';
import { JwtAuthGuard } from '../guards/jwt-auth.guard.js';

// Split out of AuthenticationController (Production Readiness Audit --
// "split oversized controllers") -- a single-route slice of /auth, kept
// separate from the core credential flows for the same reason
// DeviceSessionsController was split out. Same `auth` path prefix, so the
// public contract (GET /auth/login-history) is unchanged.
@Controller('auth')
export class LoginHistoryController {
  constructor(private readonly listLoginHistoryForAccountUseCase: ListLoginHistoryForAccountUseCase) {}

  @Get('login-history')
  @UseGuards(JwtAuthGuard)
  async loginHistory(
    @CurrentUser() user: AccessTokenClaims,
  ): Promise<ResponseEnvelope<LoginHistoryEntryResponseDto[]>> {
    const events = await this.listLoginHistoryForAccountUseCase.execute({ accountId: user.accountId });
    return envelope(events.map((event) => LoginHistoryEntryResponseDto.fromDomain(event)));
  }
}
