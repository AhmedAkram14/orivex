import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { NotFoundError } from '../../../../../shared/errors/app-error.js';
import { DoctorProfile } from '../../../domain/entities/doctor-profile.entity.js';
import { ProfessionalRank } from '../../../domain/enums/professional-rank.enum.js';
import { DoctorDomainError } from '../../../domain/exceptions/doctor-domain.error.js';
import type { DoctorProfileRepository } from '../../../domain/repositories/doctor-profile.repository.js';

import { UpdateDoctorProfileCommand } from './update-doctor-profile.command.js';
import { UpdateDoctorProfileUseCase } from './update-doctor-profile.use-case.js';

const SPECIALTY_ID = '11111111-1111-4111-8111-111111111111';

class FakeDoctorProfileRepository implements DoctorProfileRepository {
  public readonly saved: DoctorProfile[] = [];
  constructor(private readonly profile: DoctorProfile | null) {}
  findById(): Promise<DoctorProfile | null> {
    return Promise.resolve(this.profile);
  }
  findByAccountId(): Promise<DoctorProfile | null> {
    return Promise.resolve(null);
  }
  save(profile: DoctorProfile): Promise<void> {
    this.saved.push(profile);
    return Promise.resolve();
  }
}

class NoopDispatcher {
  async dispatch(): Promise<void> {}

  subscribe(): void {}
}

function buildProfile(): DoctorProfile {
  return DoctorProfile.register({
    accountId: '11111111-1111-4111-8111-111111111111',
    licenseNumber: 'LIC-1',
    specialtyId: SPECIALTY_ID,
  });
}

describe('UpdateDoctorProfileUseCase', () => {
  it('updates an existing profile', async () => {
    const profile = buildProfile();
    const repo = new FakeDoctorProfileRepository(profile);
    const useCase = new UpdateDoctorProfileUseCase(repo, new NoopDispatcher());

    const updated = await useCase.execute(
      new UpdateDoctorProfileCommand({ doctorProfileId: profile.getId(), biography: 'Updated biography.' }),
    );

    assert.equal(updated.getBiography(), 'Updated biography.');
    assert.equal(repo.saved.length, 1);
  });

  it('sets hospitalId (Doctor Onboarding)', async () => {
    const profile = buildProfile();
    const repo = new FakeDoctorProfileRepository(profile);
    const useCase = new UpdateDoctorProfileUseCase(repo, new NoopDispatcher());

    const updated = await useCase.execute(
      new UpdateDoctorProfileCommand({
        doctorProfileId: profile.getId(),
        hospitalId: '77777777-7777-4777-8777-777777777777',
      }),
    );

    assert.equal(updated.getHospitalId(), '77777777-7777-4777-8777-777777777777');
  });

  it('clears hospitalId when explicitly set to null', async () => {
    const profile = DoctorProfile.reconstitute({
      id: '11111111-1111-4111-8111-111111111111',
      accountId: '22222222-2222-4222-8222-222222222222',
      licenseNumber: 'LIC-1',
      specialtyId: SPECIALTY_ID,
      languages: [],
      hospitalId: '77777777-7777-4777-8777-777777777777',
      publications: [],
      awards: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    const repo = new FakeDoctorProfileRepository(profile);
    const useCase = new UpdateDoctorProfileUseCase(repo, new NoopDispatcher());

    const updated = await useCase.execute(
      new UpdateDoctorProfileCommand({ doctorProfileId: profile.getId(), hospitalId: null }),
    );

    assert.equal(updated.getHospitalId(), undefined);
  });

  it('throws NotFoundError when the profile does not exist', async () => {
    const repo = new FakeDoctorProfileRepository(null);
    const useCase = new UpdateDoctorProfileUseCase(repo, new NoopDispatcher());

    await assert.rejects(
      () =>
        useCase.execute(
          new UpdateDoctorProfileCommand({ doctorProfileId: 'missing-id', biography: 'New biography.' }),
        ),
      NotFoundError,
    );
  });

  it('sets specialtyId/professionalRank/licenseExpiryDate (Onboarding Redesign Stage O.3)', async () => {
    const profile = buildProfile();
    const repo = new FakeDoctorProfileRepository(profile);
    const useCase = new UpdateDoctorProfileUseCase(repo, new NoopDispatcher());

    const updated = await useCase.execute(
      new UpdateDoctorProfileCommand({
        doctorProfileId: profile.getId(),
        specialtyId: '88888888-8888-4888-8888-888888888888',
        professionalRank: ProfessionalRank.Consultant,
        licenseExpiryDate: new Date('2030-01-01'),
      }),
    );

    assert.equal(updated.getSpecialtyId(), '88888888-8888-4888-8888-888888888888');
    assert.equal(updated.getProfessionalRank(), ProfessionalRank.Consultant);
    assert.deepEqual(updated.getLicenseExpiryDate(), new Date('2030-01-01'));
  });

  it('sets departmentId together with hospitalId in the same update', async () => {
    const profile = buildProfile();
    const repo = new FakeDoctorProfileRepository(profile);
    const useCase = new UpdateDoctorProfileUseCase(repo, new NoopDispatcher());

    const updated = await useCase.execute(
      new UpdateDoctorProfileCommand({
        doctorProfileId: profile.getId(),
        hospitalId: '77777777-7777-4777-8777-777777777777',
        departmentId: '99999999-9999-4999-8999-999999999999',
      }),
    );

    assert.equal(updated.getDepartmentId(), '99999999-9999-4999-8999-999999999999');
  });

  it('rejects setting departmentId without an existing or concurrent hospitalId', async () => {
    const profile = buildProfile();
    const repo = new FakeDoctorProfileRepository(profile);
    const useCase = new UpdateDoctorProfileUseCase(repo, new NoopDispatcher());

    await assert.rejects(
      () =>
        useCase.execute(
          new UpdateDoctorProfileCommand({
            doctorProfileId: profile.getId(),
            departmentId: '99999999-9999-4999-8999-999999999999',
          }),
        ),
      DoctorDomainError,
    );
    assert.equal(repo.saved.length, 0);
  });

  it('propagates DoctorDomainError for an invalid update without persisting', async () => {
    const profile = buildProfile();
    const repo = new FakeDoctorProfileRepository(profile);
    const useCase = new UpdateDoctorProfileUseCase(repo, new NoopDispatcher());

    await assert.rejects(
      () =>
        useCase.execute(
          new UpdateDoctorProfileCommand({ doctorProfileId: profile.getId(), yearsOfExperience: -1 }),
        ),
      DoctorDomainError,
    );
    assert.equal(repo.saved.length, 0);
  });
});
