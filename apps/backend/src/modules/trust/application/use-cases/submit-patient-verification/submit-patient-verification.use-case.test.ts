import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { NotFoundError } from '../../../../../shared/errors/app-error.js';
import { GetPatientProfileByIdUseCase } from '../../../../patient/application/use-cases/get-patient-profile-by-id/get-patient-profile-by-id.use-case.js';
import { PatientProfile } from '../../../../patient/domain/entities/patient-profile.entity.js';
import type { PatientProfileRepository } from '../../../../patient/domain/repositories/patient-profile.repository.js';
import type { VerificationCase } from '../../../domain/entities/verification-case.entity.js';
import { VerificationSubjectType } from '../../../domain/enums/verification-subject-type.enum.js';
import { VerificationStatus } from '../../../domain/enums/verification-status.enum.js';
import type { VerificationCaseRepository } from '../../../domain/repositories/verification-case.repository.js';

import { SubmitPatientVerificationCommand } from './submit-patient-verification.command.js';
import { SubmitPatientVerificationUseCase } from './submit-patient-verification.use-case.js';

class FakePatientProfileRepository implements PatientProfileRepository {
  constructor(private readonly profile: PatientProfile | null) {}
  async findById(): Promise<PatientProfile | null> {
    return this.profile;
  }
  async findByAccountId(): Promise<PatientProfile | null> {
    return null;
  }
  async save(): Promise<void> {}
}

class FakeVerificationCaseRepository implements VerificationCaseRepository {
  public readonly saved: VerificationCase[] = [];
  async findById(): Promise<VerificationCase | null> {
    return null;
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

function buildPatientProfile(): PatientProfile {
  return PatientProfile.create({ accountId: '11111111-1111-4111-8111-111111111111' });
}

describe('SubmitPatientVerificationUseCase', () => {
  it('submits an identity verification case for an existing patient profile', async () => {
    const patient = buildPatientProfile();
    const repo = new FakeVerificationCaseRepository();
    const useCase = new SubmitPatientVerificationUseCase(
      repo,
      new NoopDispatcher(),
      new GetPatientProfileByIdUseCase(new FakePatientProfileRepository(patient)),
    );

    const result = await useCase.execute(
      new SubmitPatientVerificationCommand({
        patientProfileId: patient.getId(),
        subjectAccountId: patient.getAccountId(),
        documentAssetIds: ['22222222-2222-4222-8222-222222222222'],
      }),
    );

    assert.equal(result.getStatus(), VerificationStatus.Submitted);
    assert.equal(result.getSubjectType(), VerificationSubjectType.Patient);
    assert.equal(result.getSubjectAccountId(), patient.getAccountId());
    assert.equal(repo.saved.length, 1);
  });

  it('throws NotFoundError when the patient profile does not exist', async () => {
    const repo = new FakeVerificationCaseRepository();
    const useCase = new SubmitPatientVerificationUseCase(
      repo,
      new NoopDispatcher(),
      new GetPatientProfileByIdUseCase(new FakePatientProfileRepository(null)),
    );

    await assert.rejects(
      () =>
        useCase.execute(
          new SubmitPatientVerificationCommand({
            patientProfileId: '33333333-3333-4333-8333-333333333333',
            subjectAccountId: '44444444-4444-4444-8444-444444444444',
            documentAssetIds: ['22222222-2222-4222-8222-222222222222'],
          }),
        ),
      NotFoundError,
    );
    assert.equal(repo.saved.length, 0);
  });
});
