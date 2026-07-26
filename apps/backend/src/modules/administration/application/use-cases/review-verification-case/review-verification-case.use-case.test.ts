import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { DecideVerificationUseCase } from '../../../../trust/application/use-cases/decide-verification/decide-verification.use-case.js';
import { VerificationCase } from '../../../../trust/domain/entities/verification-case.entity.js';
import { VerificationStatus } from '../../../../trust/domain/enums/verification-status.enum.js';
import { TrustDomainError } from '../../../../trust/domain/exceptions/trust-domain.error.js';
import type { VerificationCaseRepository } from '../../../../trust/domain/repositories/verification-case.repository.js';
import { DoctorProfessionalDetails } from '../../../../trust/domain/value-objects/doctor-professional-details.js';

import { ReviewVerificationCaseCommand } from './review-verification-case.command.js';
import { ReviewVerificationCaseUseCase } from './review-verification-case.use-case.js';

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

class NoopDispatcher {
  async dispatch(): Promise<void> {}

  subscribe(): void {}
}

function buildSubmittedCase(): VerificationCase {
  return VerificationCase.submit({
    subjectAccountId: '11111111-1111-4111-8111-111111111111',
    subjectDetails: DoctorProfessionalDetails.create('LIC-1', 'cardiology'),
    documentAssetIds: ['22222222-2222-4222-8222-222222222222'],
  });
}

describe('ReviewVerificationCaseUseCase', () => {
  it('delegates the decision to TrustModule\'s exported DecideVerificationUseCase', async () => {
    const verificationCase = buildSubmittedCase();
    const repo = new FakeVerificationCaseRepository(verificationCase);
    const decideVerificationUseCase = new DecideVerificationUseCase(repo, new NoopDispatcher());
    const useCase = new ReviewVerificationCaseUseCase(decideVerificationUseCase);

    const result = await useCase.execute(
      new ReviewVerificationCaseCommand({
        verificationCaseId: verificationCase.getId(),
        status: VerificationStatus.Approved,
      }),
    );

    assert.equal(result.getStatus(), VerificationStatus.Approved);
    assert.equal(repo.saved.length, 1);
  });

  it('propagates TrustModule\'s own domain error for an already-decided case', async () => {
    const verificationCase = buildSubmittedCase();
    verificationCase.decide(VerificationStatus.Rejected, 'Invalid license');
    const repo = new FakeVerificationCaseRepository(verificationCase);
    const decideVerificationUseCase = new DecideVerificationUseCase(repo, new NoopDispatcher());
    const useCase = new ReviewVerificationCaseUseCase(decideVerificationUseCase);

    await assert.rejects(
      () =>
        useCase.execute(
          new ReviewVerificationCaseCommand({
            verificationCaseId: verificationCase.getId(),
            status: VerificationStatus.Approved,
          }),
        ),
      TrustDomainError,
    );
  });
});
