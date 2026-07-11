import type { VerificationCase } from '../entities/verification-case.entity.js';

export interface VerificationCaseRepository {
  findById(id: string): Promise<VerificationCase | null>;
  save(verificationCase: VerificationCase): Promise<void>;
}
