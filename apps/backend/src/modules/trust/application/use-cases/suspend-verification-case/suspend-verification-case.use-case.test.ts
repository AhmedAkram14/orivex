import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { NotFoundError } from '../../../../../shared/errors/app-error.js';
import { VerificationCase } from '../../../domain/entities/verification-case.entity.js';
import { VerificationStatus } from '../../../domain/enums/verification-status.enum.js';
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
  it('suspends an Approved case and persists it', async () => {
    const verificationCase = buildApprovedCase();
    const repo = new FakeVerificationCaseRepository(verificationCase);
    const useCase = new SuspendVerificationCaseUseCase(repo);

    const result = await useCase.execute(
      new SuspendVerificationCaseCommand({ verificationCaseId: verificationCase.getId(), reason: 'License lapsed' }),
    );

    assert.equal(result.getStatus(), VerificationStatus.Suspended);
    assert.equal(result.getReason(), 'License lapsed');
    assert.equal(repo.saved.length, 1);
  });

  it('throws NotFoundError when the case does not exist', async () => {
    const repo = new FakeVerificationCaseRepository(null);
    const useCase = new SuspendVerificationCaseUseCase(repo);

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
  });

  it('propagates VerificationCaseNotApprovedError for a case that was never Approved', async () => {
    const verificationCase = VerificationCase.submit({
      subjectAccountId: '11111111-1111-4111-8111-111111111111',
      subjectDetails: DoctorProfessionalDetails.create('LIC-1', 'cardiology'),
      documentAssetIds: ['22222222-2222-4222-8222-222222222222'],
    });
    const repo = new FakeVerificationCaseRepository(verificationCase);
    const useCase = new SuspendVerificationCaseUseCase(repo);

    await assert.rejects(
      () =>
        useCase.execute(
          new SuspendVerificationCaseCommand({ verificationCaseId: verificationCase.getId(), reason: 'x' }),
        ),
      VerificationCaseNotApprovedError,
    );
    assert.equal(repo.saved.length, 0);
  });
});
