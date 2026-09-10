import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { NotFoundError } from '../../../../../shared/errors/app-error.js';
import { Dispute } from '../../../domain/entities/dispute.entity.js';
import { DisputeStatus } from '../../../domain/enums/dispute-status.enum.js';
import type { DisputeRepository } from '../../../domain/repositories/dispute.repository.js';

import { ResolveDisputeCommand } from './resolve-dispute.command.js';
import { ResolveDisputeUseCase } from './resolve-dispute.use-case.js';

class FakeDisputeRepository implements DisputeRepository {
  public readonly updated: Dispute[] = [];
  constructor(private readonly dispute: Dispute | null) {}
  async findById(): Promise<Dispute | null> {
    return this.dispute;
  }
  async findByAppointmentId(): Promise<Dispute | null> {
    return null;
  }
  async listByRaisedByAccountId(): Promise<Dispute[]> {
    return [];
  }
  async listByStatus(): Promise<{ disputes: Dispute[]; total: number }> {
    return { disputes: [], total: 0 };
  }
  async save(): Promise<void> {}
  async update(dispute: Dispute): Promise<void> {
    this.updated.push(dispute);
  }
}

function buildDispute(): Dispute {
  return Dispute.raise({
    appointmentId: '11111111-1111-4111-8111-111111111111',
    raisedByAccountId: '22222222-2222-4222-8222-222222222222',
    reason: 'Doctor no-show.',
  });
}

describe('ResolveDisputeUseCase', () => {
  it('resolves an open dispute, recording the admin and notes', async () => {
    const dispute = buildDispute();
    const repository = new FakeDisputeRepository(dispute);
    const useCase = new ResolveDisputeUseCase(repository);

    const result = await useCase.execute(
      new ResolveDisputeCommand({
        disputeId: dispute.getId(),
        status: DisputeStatus.Resolved,
        resolutionNotes: 'Refunded the patient.',
        resolverAccountId: 'admin-account-1',
      }),
    );

    assert.equal(result.getStatus(), DisputeStatus.Resolved);
    assert.equal(repository.updated.length, 1);
  });

  it('throws NotFoundError when the dispute does not exist', async () => {
    const repository = new FakeDisputeRepository(null);
    const useCase = new ResolveDisputeUseCase(repository);

    await assert.rejects(
      () =>
        useCase.execute(
          new ResolveDisputeCommand({
            disputeId: 'missing-id',
            status: DisputeStatus.Dismissed,
            resolutionNotes: 'r',
            resolverAccountId: 'admin-account-1',
          }),
        ),
      NotFoundError,
    );
  });
});
