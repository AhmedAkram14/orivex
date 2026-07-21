import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { VerificationCase } from '../../../domain/entities/verification-case.entity.js';
import type { VerificationCaseRepository } from '../../../domain/repositories/verification-case.repository.js';

import { ListVerificationCasesForDoctorUseCase } from './list-verification-cases-for-doctor.use-case.js';

class FakeVerificationCaseRepository implements VerificationCaseRepository {
  public lastDoctorId: string | undefined;

  constructor(private readonly cases: VerificationCase[]) {}

  findById(): Promise<VerificationCase | null> {
    return Promise.resolve(null);
  }

  findPendingReview(): Promise<VerificationCase[]> {
    return Promise.resolve([]);
  }

  findAllByDoctorId(doctorId: string): Promise<VerificationCase[]> {
    this.lastDoctorId = doctorId;
    return Promise.resolve(this.cases);
  }

  save(): Promise<void> {
    return Promise.resolve();
  }
}

describe('ListVerificationCasesForDoctorUseCase', () => {
  it('delegates to the repository with the queried doctorId', async () => {
    const verificationCase = VerificationCase.submit({
      doctorId: 'doctor-1',
      licenseNumber: 'LIC-1',
      specialtyCode: 'CARD',
      documentAssetIds: ['22222222-2222-4222-8222-222222222222'],
    });
    const repository = new FakeVerificationCaseRepository([verificationCase]);
    const useCase = new ListVerificationCasesForDoctorUseCase(repository);

    const result = await useCase.execute({ doctorId: 'doctor-1' });

    assert.equal(repository.lastDoctorId, 'doctor-1');
    assert.deepEqual(result, [verificationCase]);
  });
});
