import type { VerificationCase } from '../entities/verification-case.entity.js';

export interface VerificationCaseRepository {
  findById(id: string): Promise<VerificationCase | null>;
  // Cases awaiting an admin decision (Submitted, UnderReview, MoreInfoNeeded)
  // — backs the review queue (docs/10-backend-architecture.md's
  // AdministrationModule entry), ordered oldest-submitted-first.
  findPendingReview(): Promise<VerificationCase[]>;
  save(verificationCase: VerificationCase): Promise<void>;
}
