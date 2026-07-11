import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { PatientProfile } from '../../../domain/entities/patient-profile.entity.js';
import type { PatientProfileRepository } from '../../../domain/repositories/patient-profile.repository.js';

import { GetPatientProfileByIdUseCase } from './get-patient-profile-by-id.use-case.js';

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

describe('GetPatientProfileByIdUseCase', () => {
  it('returns the profile when it exists', async () => {
    const profile = PatientProfile.create({ accountId: '11111111-1111-4111-8111-111111111111' });
    const useCase = new GetPatientProfileByIdUseCase(new FakePatientProfileRepository(profile));

    const result = await useCase.execute({ patientProfileId: profile.getId() });

    assert.equal(result?.getId(), profile.getId());
  });

  it('returns null (not a thrown error) when the profile does not exist', async () => {
    const useCase = new GetPatientProfileByIdUseCase(new FakePatientProfileRepository(null));

    const result = await useCase.execute({ patientProfileId: '22222222-2222-4222-8222-222222222222' });

    assert.equal(result, null);
  });
});
