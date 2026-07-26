import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { VerificationCase } from '../../../domain/entities/verification-case.entity.js';
import { VerificationStatus } from '../../../domain/enums/verification-status.enum.js';
import type { VerificationSubjectType } from '../../../domain/enums/verification-subject-type.enum.js';
import type { VerificationCaseRepository } from '../../../domain/repositories/verification-case.repository.js';
import { DoctorProfessionalDetails } from '../../../domain/value-objects/doctor-professional-details.js';

import { ListPendingVerificationCasesUseCase } from './list-pending-verification-cases.use-case.js';

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

describe('ListPendingVerificationCasesUseCase', () => {
  it('returns the cases awaiting review from the repository', async () => {
    const pending = VerificationCase.submit({
      subjectAccountId: '11111111-1111-4111-8111-111111111111',
      subjectDetails: DoctorProfessionalDetails.create('LIC-1', 'cardiology'),
      documentAssetIds: ['22222222-2222-4222-8222-222222222222'],
    });
    const useCase = new ListPendingVerificationCasesUseCase(new FakeVerificationCaseRepository([pending]));

    const result = await useCase.execute();

    assert.equal(result.length, 1);
    assert.equal(result[0].getId(), pending.getId());
  });

  // Onboarding Redesign integration-gap closure (2026-07-25, Stage O.8): an
  // explicit status (e.g. Approved) is how an admin finds a case to
  // suspend -- must reach the repository unchanged, not get silently
  // dropped in favor of the default pending-review set.
  it('passes an explicit status filter through to the repository', async () => {
    const repository = new FakeVerificationCaseRepository([]);
    const useCase = new ListPendingVerificationCasesUseCase(repository);

    await useCase.execute(undefined, VerificationStatus.Approved);

    assert.equal(repository.lastCall?.status, VerificationStatus.Approved);
  });
});
