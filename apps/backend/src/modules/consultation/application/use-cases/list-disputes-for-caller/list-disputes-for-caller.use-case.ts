import type { Dispute } from '../../../domain/entities/dispute.entity.js';
import type { DisputeRepository } from '../../../domain/repositories/dispute.repository.js';

export interface ListDisputesForCallerQuery {
  callerAccountId: string;
}

// Dispute System Hardening Phase 1: visibility is fully bidirectional -- this
// returns every dispute where the caller is a genuine party to the
// underlying appointment (patient or doctor), regardless of which of the two
// actually raised it. Previously this was raiser-only ("my disputes" meant
// "disputes I filed"); that left the counterparty with no way to know a
// dispute existed about their own appointment, which was the deepest gap
// found in the dispute-system audit. A genuine third party (never a party to
// the appointment) still sees nothing -- the repository's `listForParty`
// query enforces that as an access-control predicate, not a client-side
// filter.
export class ListDisputesForCallerUseCase {
  constructor(private readonly disputeRepository: DisputeRepository) {}

  async execute(query: ListDisputesForCallerQuery): Promise<Dispute[]> {
    return this.disputeRepository.listForParty(query.callerAccountId);
  }
}
