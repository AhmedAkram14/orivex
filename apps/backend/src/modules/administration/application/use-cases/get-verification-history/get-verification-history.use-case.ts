import { NotFoundError } from '../../../../../shared/errors/app-error.js';
import type { GetVerificationCaseByIdUseCase } from '../../../../trust/application/use-cases/get-verification-case-by-id/get-verification-case-by-id.use-case.js';
import type { ListVerificationCasesForSubjectUseCase } from '../../../../trust/application/use-cases/list-verification-cases-for-subject/list-verification-cases-for-subject.use-case.js';
import type { VerificationCase } from '../../../../trust/domain/entities/verification-case.entity.js';

import type { GetVerificationHistoryQuery } from './get-verification-history.query.js';

// Plain TypeScript class — no NestJS dependency; DI wiring lives in
// administration.module.ts only.
//
// Onboarding Redesign (2026-07-21 proposal, Stage O.2): the admin
// "verification history" view -- resolves the named case's subject, then
// lists every case ever submitted by that same subject (falls out of
// TrustModule's own generalized query, no new domain logic -- mirrors
// GetVerificationReviewQueueUseCase's own delegate-entirely-to-Trust shape).
export class GetVerificationHistoryUseCase {
  constructor(
    private readonly getVerificationCaseByIdUseCase: GetVerificationCaseByIdUseCase,
    private readonly listVerificationCasesForSubjectUseCase: ListVerificationCasesForSubjectUseCase,
  ) {}

  async execute(query: GetVerificationHistoryQuery): Promise<VerificationCase[]> {
    const verificationCase = await this.getVerificationCaseByIdUseCase.execute(query.verificationCaseId);
    if (!verificationCase) {
      throw new NotFoundError(`VerificationCase "${query.verificationCaseId}" not found.`);
    }

    return this.listVerificationCasesForSubjectUseCase.execute({
      subjectType: verificationCase.getSubjectType(),
      subjectAccountId: verificationCase.getSubjectAccountId(),
    });
  }
}
