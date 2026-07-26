import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { NotFoundError } from '../../../../../shared/errors/app-error.js';
import { PatientProfile } from '../../../domain/entities/patient-profile.entity.js';
import { BloodType } from '../../../domain/enums/blood-type.enum.js';
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

  subscribe(): void {}
}

describe('UpdatePatientProfileUseCase', () => {
  it('updates emergency contacts', async () => {
    const profile = PatientProfile.create({ accountId: '11111111-1111-4111-8111-111111111111' });
    const repo = new FakePatientProfileRepository(profile);
    const useCase = new UpdatePatientProfileUseCase(repo, new NoopDispatcher());

    const result = await useCase.execute(
      new UpdatePatientProfileCommand({
        patientProfileId: profile.getId(),
        emergencyContacts: [{ name: 'Jane Doe', relationship: EmergencyRelationship.Spouse, phoneNumber: '555-0100' }],
      }),
    );

    assert.equal(result.getEmergencyContacts().length, 1);
    assert.equal(repo.saved.length, 1);
  });

  it('updates bloodType/allergies/chronicDiseases/insuranceProviderId (Onboarding Redesign Stage O.3)', async () => {
    const profile = PatientProfile.create({ accountId: '11111111-1111-4111-8111-111111111111' });
    const repo = new FakePatientProfileRepository(profile);
    const useCase = new UpdatePatientProfileUseCase(repo, new NoopDispatcher());

    const result = await useCase.execute(
      new UpdatePatientProfileCommand({
        patientProfileId: profile.getId(),
        bloodType: BloodType.APositive,
        allergies: 'Peanuts',
        chronicDiseases: 'Asthma',
        insuranceProviderId: '44444444-4444-4444-8444-444444444444',
      }),
    );

    assert.equal(result.getBloodType(), BloodType.APositive);
    assert.equal(result.getAllergies(), 'Peanuts');
    assert.equal(result.getChronicDiseases(), 'Asthma');
    assert.equal(result.getInsuranceProviderId(), '44444444-4444-4444-8444-444444444444');
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
