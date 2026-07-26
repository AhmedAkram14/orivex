import { NotFoundError } from '../../../../../shared/errors/app-error.js';
import type { VerificationCase } from '../../../domain/entities/verification-case.entity.js';
import type { VerificationCaseRepository } from '../../../domain/repositories/verification-case.repository.js';

import type { SuspendVerificationCaseCommand } from './suspend-verification-case.command.js';

// Plain TypeScript class — no NestJS dependency; DI wiring lives in
// trust.module.ts only. Onboarding Redesign (2026-07-21 proposal, Stage
// O.2): revokes previously-granted standing (license lapse, a compliance
// finding) -- a distinct transition from DecideVerificationUseCase's own
// initial-review decision, reachable only from Approved. No event is
// raised: unlike approval, nothing downstream currently reacts to a
// suspension (a real, disclosed gap, not a silent omission -- notifying
// the subject is future work).
export class SuspendVerificationCaseUseCase {
  constructor(private readonly verificationCaseRepository: VerificationCaseRepository) {}

  async execute(command: SuspendVerificationCaseCommand): Promise<VerificationCase> {
    const verificationCase = await this.verificationCaseRepository.findById(command.verificationCaseId);
    if (!verificationCase) {
      throw new NotFoundError(`VerificationCase "${command.verificationCaseId}" not found.`);
    }

    verificationCase.suspend(command.reason);
    await this.verificationCaseRepository.save(verificationCase);

    return verificationCase;
  }
}
