import { Injectable, type CanActivate, type ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';

import { ForbiddenError } from '../../../../shared/errors/app-error.js';
import type { AccountRole } from '../../../identity/domain/enums/account-role.enum.js';
import type { AccessTokenClaims } from '../../application/ports/jwt-signer.port.js';
import { ROLES_KEY } from '../decorators/roles.decorator.js';

// Must run after JwtAuthGuard (request.user populated by it) -- routes using
// @Roles() must also list JwtAuthGuard first: @UseGuards(JwtAuthGuard, RolesGuard).
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<AccountRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request & { user?: AccessTokenClaims }>();
    const role = request.user?.role;
    if (!role || !requiredRoles.includes(role as AccountRole)) {
      throw new ForbiddenError('Insufficient role for this action.');
    }

    return true;
  }
}
