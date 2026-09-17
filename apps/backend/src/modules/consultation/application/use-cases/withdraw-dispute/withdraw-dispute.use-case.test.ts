import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { NotFoundError } from '../../../../../shared/errors/app-error.js';
import type { DomainEvent } from '../../../../../shared/domain/domain-event.js';
import type { DomainEventDispatcher } from '../../../../../shared/domain/domain-event-dispatcher.js';
import { ConsultationDomainError } from '../../../domain/exceptions/consultation-domain.error.js';
import { Dispute } from '../../../domain/entities/dispute.entity.js';
import { DisputeStatus } from '../../../domain/enums/dispute-status.enum.js';
import { DisputeWithdrawnEvent } from '../../../domain/events/dispute-withdrawn.event.js';
import type { DisputeRepository } from '../../../domain/repositories/dispute.repository.js';

import { WithdrawDisputeCommand } from './withdraw-dispute.command.js';
import { WithdrawDisputeUseCase } from './withdraw-dispute.use-case.js';

const RAISER_ACCOUNT_ID = '22222222-2222-4222-8222-222222222222';

class FakeDisputeRepository implements DisputeRepository {
  public readonly updated: Dispute[] = [];
  constructor(private readonly dispute: Dispute | null) {}
  async findById(): Promise<Dispute | null> {
    return this.dispute;
  }
  async findByAppointmentId(): Promise<Dispute | null> {
    return null;
  }
  async listForParty(): Promise<Dispute[]> {
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

class RecordingDispatcher implements DomainEventDispatcher {
  public readonly dispatched: DomainEvent[] = [];
  async dispatch(events: DomainEvent[]): Promise<void> {
    this.dispatched.push(...events);
  }
  subscribe(): void {}
}

function buildDispute(): Dispute {
  return Dispute.raise({
    appointmentId: '11111111-1111-4111-8111-111111111111',
    raisedByAccountId: RAISER_ACCOUNT_ID,
    reason: 'Doctor no-show.',
  });
}

describe('WithdrawDisputeUseCase', () => {
  it('withdraws an open dispute raised by the caller', async () => {
    const dispute = buildDispute();
    dispute.releaseDomainEvents();
    const repository = new FakeDisputeRepository(dispute);
    const dispatcher = new RecordingDispatcher();
    const useCase = new WithdrawDisputeUseCase(repository, dispatcher);

    const result = await useCase.execute(new WithdrawDisputeCommand({ disputeId: dispute.getId(), callerAccountId: RAISER_ACCOUNT_ID }));

    assert.equal(result.getStatus(), DisputeStatus.Withdrawn);
    assert.equal(repository.updated.length, 1);
    assert.equal(dispatcher.dispatched.length, 1);
    assert.ok(dispatcher.dispatched[0] instanceof DisputeWithdrawnEvent);
  });

  it('throws NotFoundError when the dispute does not exist', async () => {
    const repository = new FakeDisputeRepository(null);
    const dispatcher = new RecordingDispatcher();
    const useCase = new WithdrawDisputeUseCase(repository, dispatcher);

    await assert.rejects(
      () => useCase.execute(new WithdrawDisputeCommand({ disputeId: 'missing-id', callerAccountId: RAISER_ACCOUNT_ID })),
      NotFoundError,
    );
  });

  it('throws NotFoundError (not ForbiddenError) when the caller did not raise the dispute', async () => {
    const dispute = buildDispute();
    const repository = new FakeDisputeRepository(dispute);
    const dispatcher = new RecordingDispatcher();
    const useCase = new WithdrawDisputeUseCase(repository, dispatcher);

    await assert.rejects(
      () => useCase.execute(new WithdrawDisputeCommand({ disputeId: dispute.getId(), callerAccountId: 'someone-else' })),
      NotFoundError,
    );
    assert.equal(repository.updated.length, 0);
  });

  it('rejects withdrawing a dispute that is not Open', async () => {
    const dispute = buildDispute();
    dispute.resolve(DisputeStatus.Resolved, 'Refunded.', 'admin-account-1');
    const repository = new FakeDisputeRepository(dispute);
    const dispatcher = new RecordingDispatcher();
    const useCase = new WithdrawDisputeUseCase(repository, dispatcher);

    await assert.rejects(
      () => useCase.execute(new WithdrawDisputeCommand({ disputeId: dispute.getId(), callerAccountId: RAISER_ACCOUNT_ID })),
      ConsultationDomainError,
    );
  });
});
