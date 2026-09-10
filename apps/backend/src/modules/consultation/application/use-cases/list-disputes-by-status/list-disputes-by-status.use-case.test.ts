import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { Dispute } from '../../../domain/entities/dispute.entity.js';
import { DisputeStatus } from '../../../domain/enums/dispute-status.enum.js';
import type { DisputeRepository } from '../../../domain/repositories/dispute.repository.js';

import { ListDisputesByStatusQuery } from './list-disputes-by-status.query.js';
import { ListDisputesByStatusUseCase } from './list-disputes-by-status.use-case.js';

class FakeDisputeRepository implements DisputeRepository {
  public lastArgs?: { status: DisputeStatus; page: number; limit: number };
  constructor(private readonly result: { disputes: Dispute[]; total: number }) {}
  async findById(): Promise<Dispute | null> {
    return null;
  }
  async findByAppointmentId(): Promise<Dispute | null> {
    return null;
  }
  async listByRaisedByAccountId(): Promise<Dispute[]> {
    return [];
  }
  async listByStatus(status: DisputeStatus, page: number, limit: number): Promise<{ disputes: Dispute[]; total: number }> {
    this.lastArgs = { status, page, limit };
    return this.result;
  }
  async save(): Promise<void> {}
  async update(): Promise<void> {}
}

describe('ListDisputesByStatusUseCase', () => {
  it('passes status/page/limit through and returns the repository result', async () => {
    const dispute = Dispute.raise({
      appointmentId: '11111111-1111-4111-8111-111111111111',
      raisedByAccountId: '22222222-2222-4222-8222-222222222222',
      reason: 'Doctor no-show.',
    });
    const repository = new FakeDisputeRepository({ disputes: [dispute], total: 1 });
    const useCase = new ListDisputesByStatusUseCase(repository);

    const result = await useCase.execute(new ListDisputesByStatusQuery({ status: DisputeStatus.Open, page: 1, limit: 20 }));

    assert.equal(result.total, 1);
    assert.equal(result.disputes[0]?.getId(), dispute.getId());
    assert.deepEqual(repository.lastArgs, { status: DisputeStatus.Open, page: 1, limit: 20 });
  });
});
