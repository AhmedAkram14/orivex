import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { NotFoundError } from '../../../../../shared/errors/app-error.js';
import { PatientDomainError } from '../../../domain/exceptions/patient-domain.error.js';
import { PatientProfile } from '../../../domain/entities/patient-profile.entity.js';
import type { PatientProfileRepository } from '../../../domain/repositories/patient-profile.repository.js';

import { ConfirmNoKnownAllergiesCommand } from './confirm-no-known-allergies.command.js';
import { ConfirmNoKnownAllergiesUseCase } from './confirm-no-known-allergies.use-case.js';

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

const DOCTOR_ID = '22222222-2222-4222-8222-222222222222';

describe('ConfirmNoKnownAllergiesUseCase', () => {
  it('confirms no known allergies, records the confirming doctor, and saves the profile', async () => {
    const profile = PatientProfile.create({ accountId: '11111111-1111-4111-8111-111111111111' });
    const repo = new FakePatientProfileRepository(profile);
    const useCase = new ConfirmNoKnownAllergiesUseCase(repo, new NoopDispatcher());

    const result = await useCase.execute(
      new ConfirmNoKnownAllergiesCommand({ patientProfileId: profile.getId(), confirmedByDoctorId: DOCTOR_ID }),
    );

    assert.ok(result.getAllergiesConfirmedNoneAt() instanceof Date);
    assert.equal(result.getAllergiesConfirmedByDoctorId(), DOCTOR_ID);
    assert.equal(repo.saved.length, 1);
  });

  it('throws PatientDomainError (422 upstream) when the profile already has a real allergy on record', async () => {
    const profile = PatientProfile.create({ accountId: '11111111-1111-4111-8111-111111111111' });
    profile.update({ allergies: 'Penicillin' });
    const repo = new FakePatientProfileRepository(profile);
    const useCase = new ConfirmNoKnownAllergiesUseCase(repo, new NoopDispatcher());

    await assert.rejects(
      () =>
        useCase.execute(
          new ConfirmNoKnownAllergiesCommand({ patientProfileId: profile.getId(), confirmedByDoctorId: DOCTOR_ID }),
        ),
      PatientDomainError,
    );
    assert.equal(repo.saved.length, 0);
  });

  it('throws NotFoundError when the profile does not exist', async () => {
    const repo = new FakePatientProfileRepository(null);
    const useCase = new ConfirmNoKnownAllergiesUseCase(repo, new NoopDispatcher());

    await assert.rejects(
      () =>
        useCase.execute(
          new ConfirmNoKnownAllergiesCommand({
            patientProfileId: '33333333-3333-4333-8333-333333333333',
            confirmedByDoctorId: DOCTOR_ID,
          }),
        ),
      NotFoundError,
    );
  });
});
