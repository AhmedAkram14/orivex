import type { VerificationCase } from '../../../domain/entities/verification-case.entity.js';
import type { VerificationCaseRepository } from '../../../domain/repositories/verification-case.repository.js';

// Pure read — returns null on absence (mirrors Identity/Doctor's
// Get*ByIdUseCase pattern). Onboarding Redesign (2026-07-21 proposal,
// Stage O.2): backs the admin "verification history" view, which needs to
// resolve a case's subject before listing every case for that subject.
export class GetVerificationCaseByIdUseCase {
  constructor(private readonly verificationCaseRepository: VerificationCaseRepository) {}

  async execute(verificationCaseId: string): Promise<VerificationCase | null> {
    return this.verificationCaseRepository.findById(verificationCaseId);
  }
}
