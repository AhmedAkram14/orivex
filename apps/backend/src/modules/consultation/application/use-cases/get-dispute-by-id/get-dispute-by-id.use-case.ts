import type { Dispute } from '../../../domain/entities/dispute.entity.js';
import type { DisputeRepository } from '../../../domain/repositories/dispute.repository.js';

export interface GetDisputeByIdQuery {
  disputeId: string;
}

// Pure read -- mirrors the established Get*ByIdUseCase pattern.
export class GetDisputeByIdUseCase {
  constructor(private readonly disputeRepository: DisputeRepository) {}

  async execute(query: GetDisputeByIdQuery): Promise<Dispute | null> {
    return this.disputeRepository.findById(query.disputeId);
  }
}
