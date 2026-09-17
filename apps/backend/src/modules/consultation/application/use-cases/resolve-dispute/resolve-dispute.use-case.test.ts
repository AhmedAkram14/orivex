import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { NotFoundError } from '../../../../../shared/errors/app-error.js';
import type { DomainEvent } from '../../../../../shared/domain/domain-event.js';
import type { DomainEventDispatcher } from '../../../../../shared/domain/domain-event-dispatcher.js';
import { Dispute } from '../../../domain/entities/dispute.entity.js';
import { DisputeStatus } from '../../../domain/enums/dispute-status.enum.js';
import { DisputeResolvedEvent } from '../../../domain/events/dispute-resolved.event.js';
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
    raisedByAccountId: '22222222-2222-4222-8222-222222222222',
    reason: 'Doctor no-show.',
  });
}

describe('ResolveDisputeUseCase', () => {
  it('resolves an open dispute, recording the admin and notes', async () => {
    const dispute = buildDispute();
    const repository = new FakeDisputeRepository(dispute);
    const dispatcher = new RecordingDispatcher();
    const useCase = new ResolveDisputeUseCase(repository, dispatcher);

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

  it('dispatches the dispute domain events released by resolve()', async () => {
    const dispute = buildDispute();
    dispute.releaseDomainEvents();
    const repository = new FakeDisputeRepository(dispute);
    const dispatcher = new RecordingDispatcher();
    const useCase = new ResolveDisputeUseCase(repository, dispatcher);

    await useCase.execute(
      new ResolveDisputeCommand({
        disputeId: dispute.getId(),
        status: DisputeStatus.Resolved,
        resolutionNotes: 'Refunded the patient.',
        resolverAccountId: 'admin-account-1',
      }),
    );

    assert.equal(dispatcher.dispatched.length, 1);
    assert.ok(dispatcher.dispatched[0] instanceof DisputeResolvedEvent);
  });

  it('throws NotFoundError when the dispute does not exist', async () => {
    const repository = new FakeDisputeRepository(null);
    const dispatcher = new RecordingDispatcher();
    const useCase = new ResolveDisputeUseCase(repository, dispatcher);

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
