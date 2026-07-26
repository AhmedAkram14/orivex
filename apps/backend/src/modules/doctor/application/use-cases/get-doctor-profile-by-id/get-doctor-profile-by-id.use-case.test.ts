import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { DoctorProfile } from '../../../domain/entities/doctor-profile.entity.js';
import type { DoctorProfileRepository } from '../../../domain/repositories/doctor-profile.repository.js';

import { GetDoctorProfileByIdUseCase } from './get-doctor-profile-by-id.use-case.js';

class FakeDoctorProfileRepository implements DoctorProfileRepository {
  constructor(private readonly profile: DoctorProfile | null) {}
  findById(): Promise<DoctorProfile | null> {
    return Promise.resolve(this.profile);
  }
  findByAccountId(): Promise<DoctorProfile | null> {
    return Promise.resolve(null);
  }
  save(): Promise<void> {
    return Promise.resolve();
  }
}

describe('GetDoctorProfileByIdUseCase', () => {
  it('returns the profile when it exists', async () => {
    const profile = DoctorProfile.register({
      accountId: '11111111-1111-4111-8111-111111111111',
      licenseNumber: 'LIC-1',
      specialtyId: '11111111-1111-4111-8111-111111111111',
    });
    const useCase = new GetDoctorProfileByIdUseCase(new FakeDoctorProfileRepository(profile));

    const result = await useCase.execute({ doctorProfileId: profile.getId() });

    assert.equal(result, profile);
  });

  it('returns null when the profile does not exist', async () => {
    const useCase = new GetDoctorProfileByIdUseCase(new FakeDoctorProfileRepository(null));

    const result = await useCase.execute({ doctorProfileId: 'missing-id' });

    assert.equal(result, null);
  });
});
