import { Injectable, type CanActivate, type ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';

import { ForbiddenError } from '../../../../shared/errors/app-error.js';
import { AccountRole } from '../../../identity/domain/enums/account-role.enum.js';
import type { AccessTokenClaims } from '../../../authentication/application/ports/jwt-signer.port.js';
import { CheckIdentityVerificationStatusUseCase } from '../../application/use-cases/check-identity-verification-status/check-identity-verification-status.use-case.js';
import { VerificationSubjectType } from '../../domain/enums/verification-subject-type.enum.js';
import { REQUIRES_IDENTITY_VERIFICATION_KEY } from '../decorators/requires-identity-verification.decorator.js';

// Onboarding Redesign (2026-07-21 proposal, Stage O.4): the security-boundary
// half of gated-action enforcement -- returns 403 IDENTITY_VERIFICATION_REQUIRED
// for an unverified Patient, independent of and ahead of any frontend gate UI.
// Must run after JwtAuthGuard (request.user populated by it), same ordering
// requirement as RolesGuard: @UseGuards(JwtAuthGuard, RolesGuard,
// RequiresIdentityVerificationGuard).
//
// Patient-specific by design: the gate only ever concerns a Patient's own
// identity verification, so a Doctor caller on a shared route (e.g.
// POST /consultations/:id/room-token) is never subject to it -- no doctorId/
// subjectType branch needed here, the guard simply no-ops for a non-Patient
// caller.
@Injectable()
export class RequiresIdentityVerificationGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly checkIdentityVerificationStatusUseCase: CheckIdentityVerificationStatusUseCase,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const required = this.reflector.getAllAndOverride<boolean>(REQUIRES_IDENTITY_VERIFICATION_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request & { user?: AccessTokenClaims }>();
    const user = request.user;
    if (!user || user.role !== AccountRole.Patient) {
      return true;
    }

    const result = await this.checkIdentityVerificationStatusUseCase.execute({
      subjectType: VerificationSubjectType.Patient,
      subjectAccountId: user.accountId,
    });
    if (!result.isVerified) {
      throw new ForbiddenError('Identity verification is required for this action.', 'IDENTITY_VERIFICATION_REQUIRED');
    }

    return true;
  }
}
