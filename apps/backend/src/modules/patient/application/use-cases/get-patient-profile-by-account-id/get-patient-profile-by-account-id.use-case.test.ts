import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { PatientProfile } from '../../../domain/entities/patient-profile.entity.js';
import type { PatientProfileRepository } from '../../../domain/repositories/patient-profile.repository.js';

import { GetPatientProfileByAccountIdUseCase } from './get-patient-profile-by-account-id.use-case.js';

class FakePatientProfileRepository implements PatientProfileRepository {
  constructor(private readonly profile: PatientProfile | null) {}
  async findById(): Promise<PatientProfile | null> {
    return null;
  }
  async findByAccountId(): Promise<PatientProfile | null> {
    return this.profile;
  }
  async save(): Promise<void> {}
}

describe('GetPatientProfileByAccountIdUseCase', () => {
  it('returns the profile when one exists for the account', async () => {
    const profile = PatientProfile.create({ accountId: '11111111-1111-4111-8111-111111111111' });
    const useCase = new GetPatientProfileByAccountIdUseCase(new FakePatientProfileRepository(profile));

    const result = await useCase.execute({ accountId: '11111111-1111-4111-8111-111111111111' });

    assert.equal(result?.getId(), profile.getId());
  });

  it('returns null (not a thrown error) when no profile exists for the account', async () => {
    const useCase = new GetPatientProfileByAccountIdUseCase(new FakePatientProfileRepository(null));

    const result = await useCase.execute({ accountId: '22222222-2222-4222-8222-222222222222' });

    assert.equal(result, null);
  });
});
