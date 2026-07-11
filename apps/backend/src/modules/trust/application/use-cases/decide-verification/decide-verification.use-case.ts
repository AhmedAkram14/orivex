import { NotFoundError } from '../../../../../shared/errors/app-error.js';
import type { DomainEventDispatcher } from '../../../../../shared/domain/domain-event-dispatcher.js';
import type { VerificationCase } from '../../../domain/entities/verification-case.entity.js';
import type { VerificationCaseRepository } from '../../../domain/repositories/verification-case.repository.js';

import type { DecideVerificationCommand } from './decide-verification.command.js';

// Plain TypeScript class — no NestJS dependency; DI wiring lives in
// trust.module.ts only. This is the "Administration integration" touchpoint
// for Sprint 4 (docs/10-backend-architecture.md Section 12's actual call
// direction is AdministrationModule -> TrustModule: decision) — Trust owns
// and exposes this capability now; a future AdministrationModule sprint
// wires its own moderation-queue UI into this same use case, not the other
// way around.
export class DecideVerificationUseCase {
  constructor(
    private readonly verificationCaseRepository: VerificationCaseRepository,
    private readonly eventDispatcher: DomainEventDispatcher,
  ) {}

  async execute(command: DecideVerificationCommand): Promise<VerificationCase> {
    const verificationCase = await this.verificationCaseRepository.findById(command.verificationCaseId);
    if (!verificationCase) {
      throw new NotFoundError(`VerificationCase "${command.verificationCaseId}" not found.`);
    }

    verificationCase.decide(command.status, command.reason);

    await this.verificationCaseRepository.save(verificationCase);
    await this.eventDispatcher.dispatch(verificationCase.releaseDomainEvents());

    return verificationCase;
  }
}
