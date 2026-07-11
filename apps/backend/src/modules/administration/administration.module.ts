import { Module } from '@nestjs/common';

import { DecideVerificationUseCase } from '../trust/application/use-cases/decide-verification/decide-verification.use-case.js';
import { ListPendingVerificationCasesUseCase } from '../trust/application/use-cases/list-pending-verification-cases/list-pending-verification-cases.use-case.js';
import { TrustModule } from '../trust/trust.module.js';

import { GetVerificationReviewQueueUseCase } from './application/use-cases/get-verification-review-queue/get-verification-review-queue.use-case.js';
import { ReviewVerificationCaseUseCase } from './application/use-cases/review-verification-case/review-verification-case.use-case.js';

// Internal orchestration module only -- no controllers, no owned domain
// entities, no ModerationCase (docs/12-openapi.md documents no
// Administration-tagged endpoints yet; per architect direction, this stays
// an internal application layer until a formal Administration API is
// documented). Depends one-way on TrustModule, which remains completely
// unaware this module exists -- no circular imports, no forwardRef(), no
// repository sharing. TrustModule continues to exclusively own
// VerificationCase, DecideVerificationUseCase, and SubmitDoctorVerificationUseCase.
@Module({
  imports: [TrustModule],
  providers: [
    {
      provide: GetVerificationReviewQueueUseCase,
      useFactory: (listPendingVerificationCasesUseCase: ListPendingVerificationCasesUseCase) =>
        new GetVerificationReviewQueueUseCase(listPendingVerificationCasesUseCase),
      inject: [ListPendingVerificationCasesUseCase],
    },
    {
      provide: ReviewVerificationCaseUseCase,
      useFactory: (decideVerificationUseCase: DecideVerificationUseCase) =>
        new ReviewVerificationCaseUseCase(decideVerificationUseCase),
      inject: [DecideVerificationUseCase],
    },
  ],
  exports: [GetVerificationReviewQueueUseCase, ReviewVerificationCaseUseCase],
})
export class AdministrationModule {}
