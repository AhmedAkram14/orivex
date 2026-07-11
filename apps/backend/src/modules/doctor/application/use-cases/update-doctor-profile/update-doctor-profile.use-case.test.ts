import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { NotFoundError } from '../../../../../shared/errors/app-error.js';
import { DoctorProfile } from '../../../domain/entities/doctor-profile.entity.js';
import { DoctorDomainError } from '../../../domain/exceptions/doctor-domain.error.js';
import type { DoctorProfileRepository } from '../../../domain/repositories/doctor-profile.repository.js';

import { UpdateDoctorProfileCommand } from './update-doctor-profile.command.js';
import { UpdateDoctorProfileUseCase } from './update-doctor-profile.use-case.js';

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
}

function buildProfile(): DoctorProfile {
  return DoctorProfile.register({
    accountId: '11111111-1111-4111-8111-111111111111',
    licenseNumber: 'LIC-1',
    specialty: 'Dermatology',
  });
}

describe('UpdateDoctorProfileUseCase', () => {
  it('updates an existing profile', async () => {
    const profile = buildProfile();
    const repo = new FakeDoctorProfileRepository(profile);
    const useCase = new UpdateDoctorProfileUseCase(repo, new NoopDispatcher());

    const updated = await useCase.execute(
      new UpdateDoctorProfileCommand({ doctorProfileId: profile.getId(), specialty: 'Pediatrics' }),
    );

    assert.equal(updated.getSpecialty(), 'Pediatrics');
    assert.equal(repo.saved.length, 1);
  });

  it('throws NotFoundError when the profile does not exist', async () => {
    const repo = new FakeDoctorProfileRepository(null);
    const useCase = new UpdateDoctorProfileUseCase(repo, new NoopDispatcher());

    await assert.rejects(
      () =>
        useCase.execute(
          new UpdateDoctorProfileCommand({ doctorProfileId: 'missing-id', specialty: 'Pediatrics' }),
        ),
      NotFoundError,
    );
  });

  it('propagates DoctorDomainError for an invalid update without persisting', async () => {
    const profile = buildProfile();
    const repo = new FakeDoctorProfileRepository(profile);
    const useCase = new UpdateDoctorProfileUseCase(repo, new NoopDispatcher());

    await assert.rejects(
      () =>
        useCase.execute(
          new UpdateDoctorProfileCommand({ doctorProfileId: profile.getId(), specialty: '   ' }),
        ),
      DoctorDomainError,
    );
    assert.equal(repo.saved.length, 0);
  });
});
