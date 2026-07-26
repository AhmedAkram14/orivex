import { VerificationStatus } from '../../../domain/enums/verification-status.enum.js';
import type { VerificationCaseRepository } from '../../../domain/repositories/verification-case.repository.js';

import type { CheckIdentityVerificationStatusQuery } from './check-identity-verification-status.query.js';

export interface IdentityVerificationStatusResult {
  status: VerificationStatus | 'not_submitted';
  isVerified: boolean;
}

// Pure read backing both the @RequiresIdentityVerification() guard (Onboarding
// Redesign, 2026-07-21 proposal, Stage O.4) and the applicant's own
// GET .../identity-verification-status convenience endpoint -- one capability,
// two consumers. A subject's cases are ordered most-recently-submitted-first
// (VerificationCaseRepository.findAllBySubject's own contract); resubmission
// after rejection creates a new case rather than mutating the old one, and
// suspend() mutates the existing Approved case in place, so the single most
// recent case's status always reflects current standing -- no separate
// "is currently suspended" check needed.
export class CheckIdentityVerificationStatusUseCase {
  constructor(private readonly verificationCaseRepository: VerificationCaseRepository) {}

  async execute(query: CheckIdentityVerificationStatusQuery): Promise<IdentityVerificationStatusResult> {
    const cases = await this.verificationCaseRepository.findAllBySubject(query.subjectType, query.subjectAccountId);
    const latest = cases[0];
    const status = latest ? latest.getStatus() : 'not_submitted';
    return { status, isVerified: status === VerificationStatus.Approved };
  }
}
