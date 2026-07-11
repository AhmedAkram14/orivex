import type { ListPendingVerificationCasesUseCase } from '../../../../trust/application/use-cases/list-pending-verification-cases/list-pending-verification-cases.use-case.js';
import type { VerificationCase } from '../../../../trust/domain/entities/verification-case.entity.js';

// Plain TypeScript class — no NestJS dependency; DI wiring lives in
// administration.module.ts only.
//
// AdministrationModule's "Review queue" (docs/10-backend-architecture.md's
// AdministrationModule entry). Delegates entirely to TrustModule's own
// exported query -- Administration owns no VerificationCase data of its
// own and never touches Trust's repository directly.
export class GetVerificationReviewQueueUseCase {
  constructor(private readonly listPendingVerificationCasesUseCase: ListPendingVerificationCasesUseCase) {}

  async execute(): Promise<VerificationCase[]> {
    return this.listPendingVerificationCasesUseCase.execute();
  }
}
