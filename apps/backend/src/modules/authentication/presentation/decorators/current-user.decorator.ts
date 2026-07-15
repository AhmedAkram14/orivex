import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';

import type { AccessTokenClaims } from '../../application/ports/jwt-signer.port.js';

// Reads the claims JwtAuthGuard already attached to the request -- only
// usable behind @UseGuards(JwtAuthGuard), which always runs first.
export const CurrentUser = createParamDecorator((_data: unknown, ctx: ExecutionContext): AccessTokenClaims => {
  const request = ctx.switchToHttp().getRequest<Request & { user?: AccessTokenClaims }>();
  return request.user as AccessTokenClaims;
});
