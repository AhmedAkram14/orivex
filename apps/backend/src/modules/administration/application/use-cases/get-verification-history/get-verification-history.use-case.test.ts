import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { NotFoundError } from '../../../../../shared/errors/app-error.js';
import { GetVerificationCaseByIdUseCase } from '../../../../trust/application/use-cases/get-verification-case-by-id/get-verification-case-by-id.use-case.js';
import { ListVerificationCasesForSubjectUseCase } from '../../../../trust/application/use-cases/list-verification-cases-for-subject/list-verification-cases-for-subject.use-case.js';
import { VerificationCase } from '../../../../trust/domain/entities/verification-case.entity.js';
import type { VerificationCaseRepository } from '../../../../trust/domain/repositories/verification-case.repository.js';
import { DoctorProfessionalDetails } from '../../../../trust/domain/value-objects/doctor-professional-details.js';

import { GetVerificationHistoryUseCase } from './get-verification-history.use-case.js';

class FakeVerificationCaseRepository implements VerificationCaseRepository {
  constructor(private readonly cases: VerificationCase[]) {}
  async findById(id: string): Promise<VerificationCase | null> {
    return this.cases.find((c) => c.getId() === id) ?? null;
  }
  async findPendingReview(): Promise<VerificationCase[]> {
    return [];
  }
  async findAllBySubject(): Promise<VerificationCase[]> {
    return this.cases;
  }
  async save(): Promise<void> {}
}

describe('GetVerificationHistoryUseCase', () => {
  it('resolves the named case\'s subject, then returns every case for that subject', async () => {
    const firstCase = VerificationCase.submit({
      subjectAccountId: '11111111-1111-4111-8111-111111111111',
      subjectDetails: DoctorProfessionalDetails.create('LIC-1', 'cardiology'),
      documentAssetIds: ['22222222-2222-4222-8222-222222222222'],
    });
    const repo = new FakeVerificationCaseRepository([firstCase]);
    const useCase = new GetVerificationHistoryUseCase(
      new GetVerificationCaseByIdUseCase(repo),
      new ListVerificationCasesForSubjectUseCase(repo),
    );

    const result = await useCase.execute({ verificationCaseId: firstCase.getId() });

    assert.equal(result.length, 1);
    assert.equal(result[0].getId(), firstCase.getId());
  });

  it('throws NotFoundError when the named case does not exist', async () => {
    const repo = new FakeVerificationCaseRepository([]);
    const useCase = new GetVerificationHistoryUseCase(
      new GetVerificationCaseByIdUseCase(repo),
      new ListVerificationCasesForSubjectUseCase(repo),
    );

    await assert.rejects(
      () => useCase.execute({ verificationCaseId: '33333333-3333-4333-8333-333333333333' }),
      NotFoundError,
    );
  });
});
