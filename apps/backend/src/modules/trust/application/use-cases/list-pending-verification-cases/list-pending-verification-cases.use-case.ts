import type { VerificationCase } from '../../../domain/entities/verification-case.entity.js';
import type { VerificationStatus } from '../../../domain/enums/verification-status.enum.js';
import type { VerificationSubjectType } from '../../../domain/enums/verification-subject-type.enum.js';
import type { VerificationCaseRepository } from '../../../domain/repositories/verification-case.repository.js';

// Pure read — the review queue (docs/10-backend-architecture.md's
// AdministrationModule entry). Exported for AdministrationModule to consume;
// TrustModule itself remains unaware that AdministrationModule exists.
// Onboarding Redesign (2026-07-21 proposal, Stage O.2): optionally scoped to
// one subject type; omitted, returns every pending subject type. Stage O.8:
// also optionally scoped to one exact status (e.g. Approved, to find a case
// to suspend) -- omitted, defaults to the original pending-review set.
export class ListPendingVerificationCasesUseCase {
  constructor(private readonly verificationCaseRepository: VerificationCaseRepository) {}

  async execute(subjectType?: VerificationSubjectType, status?: VerificationStatus): Promise<VerificationCase[]> {
    return this.verificationCaseRepository.findPendingReview(subjectType, status);
  }
}
