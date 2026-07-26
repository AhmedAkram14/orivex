import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { VerificationCase } from '../../../domain/entities/verification-case.entity.js';
import { VerificationStatus } from '../../../domain/enums/verification-status.enum.js';
import { VerificationSubjectType } from '../../../domain/enums/verification-subject-type.enum.js';
import type { VerificationCaseRepository } from '../../../domain/repositories/verification-case.repository.js';
import { PatientIdentityDetails } from '../../../domain/value-objects/patient-identity-details.js';

import { CheckIdentityVerificationStatusUseCase } from './check-identity-verification-status.use-case.js';

class FakeVerificationCaseRepository implements VerificationCaseRepository {
  constructor(private readonly cases: VerificationCase[]) {}
  async findById(): Promise<VerificationCase | null> {
    return null;
  }
  async findPendingReview(): Promise<VerificationCase[]> {
    return [];
  }
  async findAllBySubject(): Promise<VerificationCase[]> {
    return this.cases;
  }
  async save(): Promise<void> {}
}

function submitPatientCase(subjectAccountId: string): VerificationCase {
  return VerificationCase.submit({
    subjectAccountId,
    subjectDetails: PatientIdentityDetails.create(),
    documentAssetIds: ['22222222-2222-4222-8222-222222222222'],
  });
}

describe('CheckIdentityVerificationStatusUseCase', () => {
  it('reports not_submitted/unverified when the subject has never submitted a case', async () => {
    const useCase = new CheckIdentityVerificationStatusUseCase(new FakeVerificationCaseRepository([]));

    const result = await useCase.execute({
      subjectType: VerificationSubjectType.Patient,
      subjectAccountId: '11111111-1111-4111-8111-111111111111',
    });

    assert.equal(result.status, 'not_submitted');
    assert.equal(result.isVerified, false);
  });

  it('reports unverified while the latest case is still submitted/under review', async () => {
    const pending = submitPatientCase('11111111-1111-4111-8111-111111111111');
    const useCase = new CheckIdentityVerificationStatusUseCase(new FakeVerificationCaseRepository([pending]));

    const result = await useCase.execute({
      subjectType: VerificationSubjectType.Patient,
      subjectAccountId: '11111111-1111-4111-8111-111111111111',
    });

    assert.equal(result.status, VerificationStatus.Submitted);
    assert.equal(result.isVerified, false);
  });

  it('reports verified when the latest case has been approved', async () => {
    const approved = submitPatientCase('11111111-1111-4111-8111-111111111111');
    approved.decide(VerificationStatus.Approved);
    const useCase = new CheckIdentityVerificationStatusUseCase(new FakeVerificationCaseRepository([approved]));

    const result = await useCase.execute({
      subjectType: VerificationSubjectType.Patient,
      subjectAccountId: '11111111-1111-4111-8111-111111111111',
    });

    assert.equal(result.status, VerificationStatus.Approved);
    assert.equal(result.isVerified, true);
  });

  it('reports unverified after a previously-approved case is suspended (revocation)', async () => {
    const approved = submitPatientCase('11111111-1111-4111-8111-111111111111');
    approved.decide(VerificationStatus.Approved);
    approved.suspend('License lapsed.');
    const useCase = new CheckIdentityVerificationStatusUseCase(new FakeVerificationCaseRepository([approved]));

    const result = await useCase.execute({
      subjectType: VerificationSubjectType.Patient,
      subjectAccountId: '11111111-1111-4111-8111-111111111111',
    });

    assert.equal(result.status, VerificationStatus.Suspended);
    assert.equal(result.isVerified, false);
  });

  it('reports verified based on the most-recently-submitted case only (resubmission after rejection)', async () => {
    const rejected = submitPatientCase('11111111-1111-4111-8111-111111111111');
    rejected.decide(VerificationStatus.Rejected, 'Blurry document.');
    const resubmitted = submitPatientCase('11111111-1111-4111-8111-111111111111');
    resubmitted.decide(VerificationStatus.Approved);
    // Repository contract: most-recently-submitted-first.
    const useCase = new CheckIdentityVerificationStatusUseCase(
      new FakeVerificationCaseRepository([resubmitted, rejected]),
    );

    const result = await useCase.execute({
      subjectType: VerificationSubjectType.Patient,
      subjectAccountId: '11111111-1111-4111-8111-111111111111',
    });

    assert.equal(result.status, VerificationStatus.Approved);
    assert.equal(result.isVerified, true);
  });
});
