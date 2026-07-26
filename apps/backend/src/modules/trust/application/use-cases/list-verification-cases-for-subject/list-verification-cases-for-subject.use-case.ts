import type { VerificationCase } from '../../../domain/entities/verification-case.entity.js';
import type { VerificationCaseRepository } from '../../../domain/repositories/verification-case.repository.js';

import type { ListVerificationCasesForSubjectQuery } from './list-verification-cases-for-subject.query.js';

// Pure read — the subject's own "my verification status/history" view
// (Patient or Doctor alike), most-recently-submitted-first. Generalized
// (Onboarding Redesign, 2026-07-21 proposal, Stage O.2) from the former
// Doctor-only ListVerificationCasesForDoctorUseCase; also backs the admin
// "verification history" view (falls out of this same generalized query,
// no separate use case needed).
export class ListVerificationCasesForSubjectUseCase {
  constructor(private readonly verificationCaseRepository: VerificationCaseRepository) {}

  async execute(query: ListVerificationCasesForSubjectQuery): Promise<VerificationCase[]> {
    return this.verificationCaseRepository.findAllBySubject(query.subjectType, query.subjectAccountId);
  }
}
