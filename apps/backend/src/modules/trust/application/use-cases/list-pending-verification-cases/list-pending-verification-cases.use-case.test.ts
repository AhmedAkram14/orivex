import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { VerificationCase } from '../../../domain/entities/verification-case.entity.js';
import type { VerificationCaseRepository } from '../../../domain/repositories/verification-case.repository.js';

import { ListPendingVerificationCasesUseCase } from './list-pending-verification-cases.use-case.js';

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

describe('ListPendingVerificationCasesUseCase', () => {
  it('returns the cases awaiting review from the repository', async () => {
    const pending = VerificationCase.submit({
      doctorId: '11111111-1111-4111-8111-111111111111',
      licenseNumber: 'LIC-1',
      specialtyCode: 'cardiology',
      documentAssetIds: ['22222222-2222-4222-8222-222222222222'],
    });
    const useCase = new ListPendingVerificationCasesUseCase(new FakeVerificationCaseRepository([pending]));

    const result = await useCase.execute();

    assert.equal(result.length, 1);
    assert.equal(result[0].getId(), pending.getId());
  });
});
