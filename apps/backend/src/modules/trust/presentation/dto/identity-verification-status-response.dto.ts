import type { IdentityVerificationStatusResult } from '../../application/use-cases/check-identity-verification-status/check-identity-verification-status.use-case.js';
import type { VerificationStatus } from '../../domain/enums/verification-status.enum.js';

// Onboarding Redesign (2026-07-21 proposal, Stage O.4): the UX-convenience
// half of gated-action enforcement -- lets the frontend show a "verify your
// identity" prompt ahead of time, before the caller ever hits a 403 from the
// security-boundary guard on the gated action itself.
export class IdentityVerificationStatusResponseDto {
  status!: VerificationStatus | 'not_submitted';
  isVerified!: boolean;

  static fromResult(result: IdentityVerificationStatusResult): IdentityVerificationStatusResponseDto {
    const dto = new IdentityVerificationStatusResponseDto();
    dto.status = result.status;
    dto.isVerified = result.isVerified;
    return dto;
  }
}
