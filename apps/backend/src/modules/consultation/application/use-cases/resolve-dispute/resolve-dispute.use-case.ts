import { NotFoundError } from '../../../../../shared/errors/app-error.js';
import type { Dispute } from '../../../domain/entities/dispute.entity.js';
import type { DisputeRepository } from '../../../domain/repositories/dispute.repository.js';

import type { ResolveDisputeCommand } from './resolve-dispute.command.js';

// I11 -- Admin dispute resolution: the SuperAdmin's one-time decision.
// Ownership/role is entirely enforced by AdministrationController's own
// class-level @Roles(SuperAdmin) guard, same convention as
// ModerateConsultationFeedbackUseCase.
export class ResolveDisputeUseCase {
  constructor(private readonly disputeRepository: DisputeRepository) {}

  async execute(command: ResolveDisputeCommand): Promise<Dispute> {
    const dispute = await this.disputeRepository.findById(command.disputeId);
    if (!dispute) {
      throw new NotFoundError(`Dispute "${command.disputeId}" not found.`);
    }

    dispute.resolve(command.status, command.resolutionNotes, command.resolverAccountId);
    await this.disputeRepository.update(dispute);
    return dispute;
  }
}
