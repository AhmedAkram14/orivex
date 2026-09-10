import type { Dispute } from '../../../domain/entities/dispute.entity.js';
import type { DisputeRepository } from '../../../domain/repositories/dispute.repository.js';

export interface ListDisputesForCallerQuery {
  callerAccountId: string;
}

// I11 -- Admin dispute resolution: the caller's own disputes -- either
// party can raise one, so "own" here means "I raised it", not "about my
// appointment" (the other party sees it too, but only via their own raised
// list if they separately raised one, or an admin sees every dispute
// through the admin queue).
export class ListDisputesForCallerUseCase {
  constructor(private readonly disputeRepository: DisputeRepository) {}

  async execute(query: ListDisputesForCallerQuery): Promise<Dispute[]> {
    return this.disputeRepository.listByRaisedByAccountId(query.callerAccountId);
  }
}
