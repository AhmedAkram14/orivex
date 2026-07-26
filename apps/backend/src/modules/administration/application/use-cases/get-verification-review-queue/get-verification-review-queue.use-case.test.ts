import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { ListPendingVerificationCasesUseCase } from '../../../../trust/application/use-cases/list-pending-verification-cases/list-pending-verification-cases.use-case.js';
import { VerificationCase } from '../../../../trust/domain/entities/verification-case.entity.js';
import { VerificationStatus } from '../../../../trust/domain/enums/verification-status.enum.js';
import type { VerificationSubjectType } from '../../../../trust/domain/enums/verification-subject-type.enum.js';
import type { VerificationCaseRepository } from '../../../../trust/domain/repositories/verification-case.repository.js';
import { DoctorProfessionalDetails } from '../../../../trust/domain/value-objects/doctor-professional-details.js';

import { GetVerificationReviewQueueUseCase } from './get-verification-review-queue.use-case.js';

class FakeVerificationCaseRepository implements VerificationCaseRepository {
  public lastCall: { subjectType?: VerificationSubjectType; status?: VerificationStatus } | undefined;
  constructor(private readonly pending: VerificationCase[]) {}
  async findById(): Promise<VerificationCase | null> {
    return null;
  }
  async findPendingReview(subjectType?: VerificationSubjectType, status?: VerificationStatus): Promise<VerificationCase[]> {
    this.lastCall = { subjectType, status };
    return this.pending;
  }

  findAllBySubject(): Promise<VerificationCase[]> {
    return Promise.resolve([]);
  }
  async save(): Promise<void> {}
}

describe('GetVerificationReviewQueueUseCase', () => {
  it('delegates to TrustModule\'s exported query and returns its result unchanged', async () => {
    const pending = VerificationCase.submit({
      subjectAccountId: '11111111-1111-4111-8111-111111111111',
      subjectDetails: DoctorProfessionalDetails.create('LIC-1', 'cardiology'),
      documentAssetIds: ['22222222-2222-4222-8222-222222222222'],
    });
    const listPendingVerificationCasesUseCase = new ListPendingVerificationCasesUseCase(
      new FakeVerificationCaseRepository([pending]),
    );
    const useCase = new GetVerificationReviewQueueUseCase(listPendingVerificationCasesUseCase);

    const result = await useCase.execute();

    assert.equal(result.length, 1);
    assert.equal(result[0].getId(), pending.getId());
  });

  it('passes an explicit status filter through to the repository', async () => {
    const repository = new FakeVerificationCaseRepository([]);
    const useCase = new GetVerificationReviewQueueUseCase(new ListPendingVerificationCasesUseCase(repository));

    await useCase.execute(undefined, VerificationStatus.Approved);

    assert.equal(repository.lastCall?.status, VerificationStatus.Approved);
  });
});
