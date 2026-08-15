import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { NotFoundError } from '../../../../../shared/errors/app-error.js';
import type { DomainEvent } from '../../../../../shared/domain/domain-event.js';
import type { DomainEventDispatcher } from '../../../../../shared/domain/domain-event-dispatcher.js';
import { VerificationCase } from '../../../domain/entities/verification-case.entity.js';
import { VerificationStatus } from '../../../domain/enums/verification-status.enum.js';
import { VerificationCaseSuspendedEvent } from '../../../domain/events/verification-case-suspended.event.js';
import { VerificationCaseNotApprovedError } from '../../../domain/exceptions/verification-case-not-approved.error.js';
import type { VerificationCaseRepository } from '../../../domain/repositories/verification-case.repository.js';
import { DoctorProfessionalDetails } from '../../../domain/value-objects/doctor-professional-details.js';

import { SuspendVerificationCaseCommand } from './suspend-verification-case.command.js';
import { SuspendVerificationCaseUseCase } from './suspend-verification-case.use-case.js';

class FakeVerificationCaseRepository implements VerificationCaseRepository {
  public readonly saved: VerificationCase[] = [];
  constructor(private readonly verificationCase: VerificationCase | null) {}
  async findById(): Promise<VerificationCase | null> {
    return this.verificationCase;
  }
  async findPendingReview(): Promise<VerificationCase[]> {
    return [];
  }
  findAllBySubject(): Promise<VerificationCase[]> {
    return Promise.resolve([]);
  }
  async save(verificationCase: VerificationCase): Promise<void> {
    this.saved.push(verificationCase);
  }
}

class FakeDomainEventDispatcher implements DomainEventDispatcher {
  public dispatched: DomainEvent[] = [];
  subscribe(): void {
    // not exercised by this use case's tests
  }
  async dispatch(events: DomainEvent[]): Promise<void> {
    this.dispatched.push(...events);
  }
}

function buildApprovedCase(): VerificationCase {
  const verificationCase = VerificationCase.submit({
    subjectAccountId: '11111111-1111-4111-8111-111111111111',
    subjectDetails: DoctorProfessionalDetails.create('LIC-1', 'cardiology'),
    documentAssetIds: ['22222222-2222-4222-8222-222222222222'],
  });
  verificationCase.decide(VerificationStatus.Approved);
  verificationCase.releaseDomainEvents();
  return verificationCase;
}

describe('SuspendVerificationCaseUseCase', () => {
  it('suspends an Approved case, persists it, and dispatches VerificationCaseSuspendedEvent', async () => {
    const verificationCase = buildApprovedCase();
    const repo = new FakeVerificationCaseRepository(verificationCase);
    const dispatcher = new FakeDomainEventDispatcher();
    const useCase = new SuspendVerificationCaseUseCase(repo, dispatcher);

    const result = await useCase.execute(
      new SuspendVerificationCaseCommand({ verificationCaseId: verificationCase.getId(), reason: 'License lapsed' }),
    );

    assert.equal(result.getStatus(), VerificationStatus.Suspended);
    assert.equal(result.getReason(), 'License lapsed');
    assert.equal(repo.saved.length, 1);
    assert.equal(dispatcher.dispatched.length, 1);
    assert.ok(dispatcher.dispatched[0] instanceof VerificationCaseSuspendedEvent);
    const event = dispatcher.dispatched[0] as VerificationCaseSuspendedEvent;
    assert.equal(event.verificationCaseId, verificationCase.getId());
    assert.equal(event.reason, 'License lapsed');
  });

  it('throws NotFoundError when the case does not exist', async () => {
    const repo = new FakeVerificationCaseRepository(null);
    const dispatcher = new FakeDomainEventDispatcher();
    const useCase = new SuspendVerificationCaseUseCase(repo, dispatcher);

    await assert.rejects(
      () =>
        useCase.execute(
          new SuspendVerificationCaseCommand({
            verificationCaseId: '33333333-3333-4333-8333-333333333333',
            reason: 'x',
          }),
        ),
      NotFoundError,
    );
    assert.equal(dispatcher.dispatched.length, 0);
  });

  it('propagates VerificationCaseNotApprovedError for a case that was never Approved, and dispatches nothing', async () => {
    const verificationCase = VerificationCase.submit({
      subjectAccountId: '11111111-1111-4111-8111-111111111111',
      subjectDetails: DoctorProfessionalDetails.create('LIC-1', 'cardiology'),
      documentAssetIds: ['22222222-2222-4222-8222-222222222222'],
    });
    const repo = new FakeVerificationCaseRepository(verificationCase);
    const dispatcher = new FakeDomainEventDispatcher();
    const useCase = new SuspendVerificationCaseUseCase(repo, dispatcher);

    await assert.rejects(
      () =>
        useCase.execute(
          new SuspendVerificationCaseCommand({ verificationCaseId: verificationCase.getId(), reason: 'x' }),
        ),
      VerificationCaseNotApprovedError,
    );
    assert.equal(repo.saved.length, 0);
    assert.equal(dispatcher.dispatched.length, 0);
  });

  it('rejects an attempt to suspend an already-Suspended case again, without crashing or dispatching a duplicate event', async () => {
    const verificationCase = buildApprovedCase();
    const repo = new FakeVerificationCaseRepository(verificationCase);
    const dispatcher = new FakeDomainEventDispatcher();
    const useCase = new SuspendVerificationCaseUseCase(repo, dispatcher);

    await useCase.execute(
      new SuspendVerificationCaseCommand({ verificationCaseId: verificationCase.getId(), reason: 'License lapsed' }),
    );
    dispatcher.dispatched = [];

    await assert.rejects(
      () =>
        useCase.execute(
          new SuspendVerificationCaseCommand({ verificationCaseId: verificationCase.getId(), reason: 'again' }),
        ),
      VerificationCaseNotApprovedError,
    );
    assert.equal(dispatcher.dispatched.length, 0);
  });
});
