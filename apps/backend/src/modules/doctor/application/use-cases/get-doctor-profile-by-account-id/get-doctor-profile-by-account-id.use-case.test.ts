import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { DoctorProfile } from '../../../domain/entities/doctor-profile.entity.js';
import type { DoctorProfileRepository } from '../../../domain/repositories/doctor-profile.repository.js';

import { GetDoctorProfileByAccountIdUseCase } from './get-doctor-profile-by-account-id.use-case.js';

class FakeDoctorProfileRepository implements DoctorProfileRepository {
  constructor(private readonly profile: DoctorProfile | null) {}
  async findById(): Promise<DoctorProfile | null> {
    return null;
  }
  async findByAccountId(): Promise<DoctorProfile | null> {
    return this.profile;
  }
  async save(): Promise<void> {}
}

describe('GetDoctorProfileByAccountIdUseCase', () => {
  it('returns the profile when one exists for the account', async () => {
    const profile = DoctorProfile.register({
      accountId: '11111111-1111-4111-8111-111111111111',
      licenseNumber: 'LIC-001',
      specialtyId: '11111111-1111-4111-8111-111111111111',
    });
    const useCase = new GetDoctorProfileByAccountIdUseCase(new FakeDoctorProfileRepository(profile));

    const result = await useCase.execute({ accountId: '11111111-1111-4111-8111-111111111111' });

    assert.equal(result?.getId(), profile.getId());
  });

  it('returns null (not a thrown error) when no profile exists for the account', async () => {
    const useCase = new GetDoctorProfileByAccountIdUseCase(new FakeDoctorProfileRepository(null));

    const result = await useCase.execute({ accountId: '22222222-2222-4222-8222-222222222222' });

    assert.equal(result, null);
  });
});
