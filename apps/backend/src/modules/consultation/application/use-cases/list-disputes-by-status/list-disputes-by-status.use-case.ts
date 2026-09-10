import type { Dispute } from '../../../domain/entities/dispute.entity.js';
import type { DisputeRepository } from '../../../domain/repositories/dispute.repository.js';

import type { ListDisputesByStatusQuery } from './list-disputes-by-status.query.js';

export interface ListDisputesByStatusResult {
  disputes: Dispute[];
  total: number;
}

// I11 -- Admin dispute resolution: the admin queue -- defaults to Open in
// the controller (what an admin needs to act on).
export class ListDisputesByStatusUseCase {
  constructor(private readonly disputeRepository: DisputeRepository) {}

  async execute(query: ListDisputesByStatusQuery): Promise<ListDisputesByStatusResult> {
    const { disputes, total } = await this.disputeRepository.listByStatus(query.status, query.page, query.limit);
    return { disputes, total };
  }
}
