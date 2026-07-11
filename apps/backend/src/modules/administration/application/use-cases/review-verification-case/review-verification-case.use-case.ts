import { DecideVerificationCommand } from '../../../../trust/application/use-cases/decide-verification/decide-verification.command.js';
import type { DecideVerificationUseCase } from '../../../../trust/application/use-cases/decide-verification/decide-verification.use-case.js';
import type { VerificationCase } from '../../../../trust/domain/entities/verification-case.entity.js';

import type { ReviewVerificationCaseCommand } from './review-verification-case.command.js';

// Plain TypeScript class — no NestJS dependency; DI wiring lives in
// administration.module.ts only.
//
// AdministrationModule's "verification review application service"
// (docs/10-backend-architecture.md's AdministrationModule entry:
// "Moderation/verification workflow execution"). Orchestrates the review
// decision by delegating to TrustModule's own exported DecideVerificationUseCase
// -- TrustModule exclusively owns the VerificationCase aggregate and its
// repository; Administration never manipulates it directly and introduces
// no duplicate business logic of its own.
export class ReviewVerificationCaseUseCase {
  constructor(private readonly decideVerificationUseCase: DecideVerificationUseCase) {}

  async execute(command: ReviewVerificationCaseCommand): Promise<VerificationCase> {
    return this.decideVerificationUseCase.execute(
      new DecideVerificationCommand({
        verificationCaseId: command.verificationCaseId,
        status: command.status,
        reason: command.reason,
      }),
    );
  }
}
