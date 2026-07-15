import { Inject, Injectable, type CanActivate, type ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';

import { UnauthorizedError } from '../../../../shared/errors/app-error.js';
import type { AccessTokenClaims, JwtSignerPort } from '../../application/ports/jwt-signer.port.js';
import { JWT_SIGNER } from '../../application/ports/tokens.js';

// No Passport dependency: a hand-written CanActivate calling JwtSignerPort
// directly is simpler than a full Passport strategy for exactly one guard,
// and matches this codebase's general preference for explicit logic over
// framework machinery (use-cases are plain classes, not decorated, either).
// Exported from AuthenticationModule so every other module protects routes
// the same way, without depending on Authentication's internals.
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(@Inject(JWT_SIGNER) private readonly jwtSigner: JwtSignerPort) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request & { user?: AccessTokenClaims }>();
    const token = this.extractToken(request);
    if (!token) {
      throw new UnauthorizedError('Missing bearer token.');
    }

    try {
      request.user = await this.jwtSigner.verify(token);
    } catch {
      throw new UnauthorizedError('Invalid or expired access token.');
    }

    return true;
  }

  private extractToken(request: Request): string | undefined {
    const header = request.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
      return undefined;
    }
    return header.slice('Bearer '.length);
  }
}
