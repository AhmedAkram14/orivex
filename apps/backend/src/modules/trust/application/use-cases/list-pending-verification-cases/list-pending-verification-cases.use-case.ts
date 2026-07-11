import type { VerificationCase } from '../../../domain/entities/verification-case.entity.js';
import type { VerificationCaseRepository } from '../../../domain/repositories/verification-case.repository.js';

// Pure read — the review queue (docs/10-backend-architecture.md's
// AdministrationModule entry). Exported for AdministrationModule to consume;
// TrustModule itself remains unaware that AdministrationModule exists.
export class ListPendingVerificationCasesUseCase {
  constructor(private readonly verificationCaseRepository: VerificationCaseRepository) {}

  async execute(): Promise<VerificationCase[]> {
    return this.verificationCaseRepository.findPendingReview();
  }
}
