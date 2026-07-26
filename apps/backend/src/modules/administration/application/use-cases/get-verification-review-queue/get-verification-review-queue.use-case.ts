import type { ListPendingVerificationCasesUseCase } from '../../../../trust/application/use-cases/list-pending-verification-cases/list-pending-verification-cases.use-case.js';
import type { VerificationCase } from '../../../../trust/domain/entities/verification-case.entity.js';
import type { VerificationStatus } from '../../../../trust/domain/enums/verification-status.enum.js';
import type { VerificationSubjectType } from '../../../../trust/domain/enums/verification-subject-type.enum.js';

// Plain TypeScript class — no NestJS dependency; DI wiring lives in
// administration.module.ts only.
//
// AdministrationModule's "Review queue" (docs/10-backend-architecture.md's
// AdministrationModule entry). Delegates entirely to TrustModule's own
// exported query -- Administration owns no VerificationCase data of its
// own and never touches Trust's repository directly. Onboarding Redesign
// (2026-07-21 proposal, Stage O.2): optionally scoped to one subject type,
// backing the admin queue's subject-type filter; omitted, returns both.
// Stage O.8: also optionally scoped to one exact status, backing the
// queue's status filter -- omitted, returns the default pending-review set.
export class GetVerificationReviewQueueUseCase {
  constructor(private readonly listPendingVerificationCasesUseCase: ListPendingVerificationCasesUseCase) {}

  async execute(subjectType?: VerificationSubjectType, status?: VerificationStatus): Promise<VerificationCase[]> {
    return this.listPendingVerificationCasesUseCase.execute(subjectType, status);
  }
}
