import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { NotFoundError } from '../../../../../shared/errors/app-error.js';
import { TrustDomainError } from '../../../domain/exceptions/trust-domain.error.js';
import { VerificationCase } from '../../../domain/entities/verification-case.entity.js';
import { VerificationStatus } from '../../../domain/enums/verification-status.enum.js';
import type { VerificationCaseRepository } from '../../../domain/repositories/verification-case.repository.js';

import { DecideVerificationCommand } from './decide-verification.command.js';
import { DecideVerificationUseCase } from './decide-verification.use-case.js';

class FakeVerificationCaseRepository implements VerificationCaseRepository {
  public readonly saved: VerificationCase[] = [];
  constructor(private readonly verificationCase: VerificationCase | null) {}
  async findById(): Promise<VerificationCase | null> {
    return this.verificationCase;
  }
  async findPendingReview(): Promise<VerificationCase[]> {
    return [];
  }
  async save(verificationCase: VerificationCase): Promise<void> {
    this.saved.push(verificationCase);
  }
}

class RecordingDispatcher {
  public readonly dispatched: unknown[] = [];
  async dispatch(events: unknown[]): Promise<void> {
    this.dispatched.push(...events);
  }

  subscribe(): void {}
}

function buildSubmittedCase(): VerificationCase {
  return VerificationCase.submit({
    doctorId: '11111111-1111-4111-8111-111111111111',
    licenseNumber: 'LIC-1',
    specialtyCode: 'cardiology',
    documentAssetIds: ['22222222-2222-4222-8222-222222222222'],
  });
}

describe('DecideVerificationUseCase', () => {
  it('approves a submitted case and dispatches DoctorVerified', async () => {
    const verificationCase = buildSubmittedCase();
    const repo = new FakeVerificationCaseRepository(verificationCase);
    const dispatcher = new RecordingDispatcher();
    const useCase = new DecideVerificationUseCase(repo, dispatcher);

    const result = await useCase.execute(
      new DecideVerificationCommand({
        verificationCaseId: verificationCase.getId(),
        status: VerificationStatus.Approved,
      }),
    );

    assert.equal(result.getStatus(), VerificationStatus.Approved);
    assert.ok(result.getDecidedAt());
    assert.equal(repo.saved.length, 1);
    assert.equal(dispatcher.dispatched.length, 1);
  });

  it('throws NotFoundError when the verification case does not exist', async () => {
    const repo = new FakeVerificationCaseRepository(null);
    const useCase = new DecideVerificationUseCase(repo, new RecordingDispatcher());

    await assert.rejects(
      () =>
        useCase.execute(
          new DecideVerificationCommand({
            verificationCaseId: '33333333-3333-4333-8333-333333333333',
            status: VerificationStatus.Approved,
          }),
        ),
      NotFoundError,
    );
  });

  it('throws TrustDomainError when the case has already been decided', async () => {
    const verificationCase = buildSubmittedCase();
    verificationCase.decide(VerificationStatus.Rejected, 'Invalid license');
    const repo = new FakeVerificationCaseRepository(verificationCase);
    const useCase = new DecideVerificationUseCase(repo, new RecordingDispatcher());

    await assert.rejects(
      () =>
        useCase.execute(
          new DecideVerificationCommand({
            verificationCaseId: verificationCase.getId(),
            status: VerificationStatus.Approved,
          }),
        ),
      TrustDomainError,
    );
    assert.equal(repo.saved.length, 0);
  });
});
