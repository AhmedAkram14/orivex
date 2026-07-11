import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { NotFoundError } from '../../../../../shared/errors/app-error.js';
import { DoctorProfile } from '../../../../doctor/domain/entities/doctor-profile.entity.js';
import { GetDoctorProfileByIdUseCase } from '../../../../doctor/application/use-cases/get-doctor-profile-by-id/get-doctor-profile-by-id.use-case.js';
import type { DoctorProfileRepository } from '../../../../doctor/domain/repositories/doctor-profile.repository.js';
import type { VerificationCase } from '../../../domain/entities/verification-case.entity.js';
import { VerificationStatus } from '../../../domain/enums/verification-status.enum.js';
import type { VerificationCaseRepository } from '../../../domain/repositories/verification-case.repository.js';

import { SubmitDoctorVerificationCommand } from './submit-doctor-verification.command.js';
import { SubmitDoctorVerificationUseCase } from './submit-doctor-verification.use-case.js';

class FakeDoctorProfileRepository implements DoctorProfileRepository {
  constructor(private readonly profile: DoctorProfile | null) {}
  async findById(): Promise<DoctorProfile | null> {
    return this.profile;
  }
  async findByAccountId(): Promise<DoctorProfile | null> {
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
  async save(verificationCase: VerificationCase): Promise<void> {
    this.saved.push(verificationCase);
  }
}

class NoopDispatcher {
  async dispatch(): Promise<void> {}

  subscribe(): void {}
}

function buildDoctorProfile(): DoctorProfile {
  return DoctorProfile.register({
    accountId: '11111111-1111-4111-8111-111111111111',
    licenseNumber: 'LIC-1',
    specialty: 'Cardiology',
  });
}

describe('SubmitDoctorVerificationUseCase', () => {
  it('submits a verification case for an existing doctor profile', async () => {
    const doctor = buildDoctorProfile();
    const repo = new FakeVerificationCaseRepository();
    const useCase = new SubmitDoctorVerificationUseCase(
      repo,
      new NoopDispatcher(),
      new GetDoctorProfileByIdUseCase(new FakeDoctorProfileRepository(doctor)),
    );

    const result = await useCase.execute(
      new SubmitDoctorVerificationCommand({
        doctorId: doctor.getId(),
        licenseNumber: 'LIC-1',
        specialtyCode: 'cardiology',
        documentAssetIds: ['22222222-2222-4222-8222-222222222222'],
      }),
    );

    assert.equal(result.getStatus(), VerificationStatus.Submitted);
    assert.equal(result.getDoctorId(), doctor.getId());
    assert.equal(repo.saved.length, 1);
  });

  it('throws NotFoundError when the doctor profile does not exist', async () => {
    const repo = new FakeVerificationCaseRepository();
    const useCase = new SubmitDoctorVerificationUseCase(
      repo,
      new NoopDispatcher(),
      new GetDoctorProfileByIdUseCase(new FakeDoctorProfileRepository(null)),
    );

    await assert.rejects(
      () =>
        useCase.execute(
          new SubmitDoctorVerificationCommand({
            doctorId: '33333333-3333-4333-8333-333333333333',
            licenseNumber: 'LIC-1',
            specialtyCode: 'cardiology',
            documentAssetIds: ['22222222-2222-4222-8222-222222222222'],
          }),
        ),
      NotFoundError,
    );
    assert.equal(repo.saved.length, 0);
  });
});
