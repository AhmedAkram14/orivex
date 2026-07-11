import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { NotFoundError } from '../../../../../shared/errors/app-error.js';
import { PatientProfile } from '../../../domain/entities/patient-profile.entity.js';
import { EmergencyRelationship } from '../../../domain/enums/emergency-relationship.enum.js';
import type { PatientProfileRepository } from '../../../domain/repositories/patient-profile.repository.js';

import { UpdatePatientProfileCommand } from './update-patient-profile.command.js';
import { UpdatePatientProfileUseCase } from './update-patient-profile.use-case.js';

class FakePatientProfileRepository implements PatientProfileRepository {
  public readonly saved: PatientProfile[] = [];
  constructor(private readonly profile: PatientProfile | null) {}
  async findById(): Promise<PatientProfile | null> {
    return this.profile;
  }
  async findByAccountId(): Promise<PatientProfile | null> {
    return null;
  }
  async save(profile: PatientProfile): Promise<void> {
    this.saved.push(profile);
  }
}

class NoopDispatcher {
  async dispatch(): Promise<void> {}
}

describe('UpdatePatientProfileUseCase', () => {
  it('updates the date of birth and emergency contacts', async () => {
    const profile = PatientProfile.create({ accountId: '11111111-1111-4111-8111-111111111111' });
    const repo = new FakePatientProfileRepository(profile);
    const useCase = new UpdatePatientProfileUseCase(repo, new NoopDispatcher());

    const result = await useCase.execute(
      new UpdatePatientProfileCommand({
        patientProfileId: profile.getId(),
        dateOfBirth: new Date('1990-01-01'),
        emergencyContacts: [{ name: 'Jane Doe', relationship: EmergencyRelationship.Spouse, phoneNumber: '555-0100' }],
      }),
    );

    assert.ok(result.getDateOfBirth());
    assert.equal(result.getEmergencyContacts().length, 1);
    assert.equal(repo.saved.length, 1);
  });

  it('throws NotFoundError when the profile does not exist', async () => {
    const repo = new FakePatientProfileRepository(null);
    const useCase = new UpdatePatientProfileUseCase(repo, new NoopDispatcher());

    await assert.rejects(
      () =>
        useCase.execute(
          new UpdatePatientProfileCommand({ patientProfileId: '33333333-3333-4333-8333-333333333333' }),
        ),
      NotFoundError,
    );
  });
});
