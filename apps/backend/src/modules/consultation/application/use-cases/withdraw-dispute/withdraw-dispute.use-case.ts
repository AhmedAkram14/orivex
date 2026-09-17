import { NotFoundError } from '../../../../../shared/errors/app-error.js';
import type { DomainEventDispatcher } from '../../../../../shared/domain/domain-event-dispatcher.js';
import type { Dispute } from '../../../domain/entities/dispute.entity.js';
import type { DisputeRepository } from '../../../domain/repositories/dispute.repository.js';

import type { WithdrawDisputeCommand } from './withdraw-dispute.command.js';

// Dispute System Hardening Phase 1: the raiser retracting their own dispute
// while it's still Open (see Dispute.withdraw()'s own status-transition
// guard). 404-not-403 for both "no such dispute" and "you didn't raise this
// one" -- matches DisputeController's existing convention of never revealing
// a dispute's existence to a non-owner on its single-resource routes.
export class WithdrawDisputeUseCase {
  constructor(
    private readonly disputeRepository: DisputeRepository,
    private readonly eventDispatcher: DomainEventDispatcher,
  ) {}

  async execute(command: WithdrawDisputeCommand): Promise<Dispute> {
    const dispute = await this.disputeRepository.findById(command.disputeId);
    if (!dispute || dispute.getRaisedByAccountId() !== command.callerAccountId) {
      throw new NotFoundError(`Dispute "${command.disputeId}" not found.`);
    }

    dispute.withdraw();
    await this.disputeRepository.update(dispute);
    await this.eventDispatcher.dispatch(dispute.releaseDomainEvents());
    return dispute;
  }
}
