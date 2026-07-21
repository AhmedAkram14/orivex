import type { VerificationCase } from '../../../domain/entities/verification-case.entity.js';
import type { VerificationCaseRepository } from '../../../domain/repositories/verification-case.repository.js';

import type { ListVerificationCasesForDoctorQuery } from './list-verification-cases-for-doctor.query.js';

// Pure read — Doctor Onboarding (Phase 4 continuation): the applicant's own
// "my verification status/history" view, most-recently-submitted-first.
// Mirrors ListPendingVerificationCasesUseCase's own shape exactly.
export class ListVerificationCasesForDoctorUseCase {
  constructor(private readonly verificationCaseRepository: VerificationCaseRepository) {}

  async execute(query: ListVerificationCasesForDoctorQuery): Promise<VerificationCase[]> {
    return this.verificationCaseRepository.findAllByDoctorId(query.doctorId);
  }
}
