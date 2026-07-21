import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { ListPendingVerificationCasesUseCase } from '../../../../trust/application/use-cases/list-pending-verification-cases/list-pending-verification-cases.use-case.js';
import { VerificationCase } from '../../../../trust/domain/entities/verification-case.entity.js';
import type { VerificationCaseRepository } from '../../../../trust/domain/repositories/verification-case.repository.js';

import { GetVerificationReviewQueueUseCase } from './get-verification-review-queue.use-case.js';

class FakeVerificationCaseRepository implements VerificationCaseRepository {
  constructor(private readonly pending: VerificationCase[]) {}
  async findById(): Promise<VerificationCase | null> {
    return null;
  }
  async findPendingReview(): Promise<VerificationCase[]> {
    return this.pending;
  }

  findAllByDoctorId(): Promise<VerificationCase[]> {
    return Promise.resolve([]);
  }
  async save(): Promise<void> {}
}

describe('GetVerificationReviewQueueUseCase', () => {
  it('delegates to TrustModule\'s exported query and returns its result unchanged', async () => {
    const pending = VerificationCase.submit({
      doctorId: '11111111-1111-4111-8111-111111111111',
      licenseNumber: 'LIC-1',
      specialtyCode: 'cardiology',
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
});
