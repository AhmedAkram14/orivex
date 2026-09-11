import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { NotFoundError } from '../../../../../shared/errors/app-error.js';
import { GetPatientProfileByAccountIdUseCase } from '../../../../patient/application/use-cases/get-patient-profile-by-account-id/get-patient-profile-by-account-id.use-case.js';
import type { PatientProfile } from '../../../../patient/domain/entities/patient-profile.entity.js';
import type { PatientProfileRepository } from '../../../../patient/domain/repositories/patient-profile.repository.js';
import { WaitlistEntry } from '../../../domain/entities/waitlist-entry.entity.js';
import type { WaitlistEntryRepository } from '../../../domain/repositories/waitlist-entry.repository.js';

import { CancelWaitlistEntryCommand } from './cancel-waitlist-entry.command.js';
import { CancelWaitlistEntryUseCase } from './cancel-waitlist-entry.use-case.js';

const PATIENT_ID = '11111111-1111-4111-8111-111111111111';
const OTHER_PATIENT_ID = '55555555-5555-4555-8555-555555555555';
const DOCTOR_ID = '22222222-2222-4222-8222-222222222222';
const PATIENT_ACCOUNT_ID = 'patient-account';

class FakePatientProfileRepository implements PatientProfileRepository {
  async findById(): Promise<PatientProfile | null> {
    return null;
  }
  async findByAccountId(accountId: string): Promise<PatientProfile | null> {
    return accountId === PATIENT_ACCOUNT_ID ? ({ getId: () => PATIENT_ID } as PatientProfile) : null;
  }
  async save(): Promise<void> {}
}

class FakeWaitlistEntryRepository implements WaitlistEntryRepository {
  public readonly updated: WaitlistEntry[] = [];
  constructor(private readonly entry: WaitlistEntry | null) {}
  async findById(id: string): Promise<WaitlistEntry | null> {
    return this.entry?.getId() === id ? this.entry : null;
  }
  async listByPatientId(): Promise<WaitlistEntry[]> {
    return [];
  }
  async hasActiveEntry(): Promise<boolean> {
    return false;
  }
  async claimEarliestEligibleEntry(): Promise<WaitlistEntry | null> {
    return null;
  }
  async save(): Promise<void> {}
  async update(entry: WaitlistEntry): Promise<void> {
    this.updated.push(entry);
  }
}

function buildEntry(patientId = PATIENT_ID): WaitlistEntry {
  const now = Date.now();
  return WaitlistEntry.join({
    patientId,
    doctorId: DOCTOR_ID,
    earliestAcceptableAt: new Date(now + 24 * 60 * 60 * 1000),
    latestAcceptableAt: new Date(now + 7 * 24 * 60 * 60 * 1000),
  });
}

describe('CancelWaitlistEntryUseCase', () => {
  it('cancels the caller\'s own entry', async () => {
    const entry = buildEntry();
    const waitlistRepository = new FakeWaitlistEntryRepository(entry);
    const useCase = new CancelWaitlistEntryUseCase(
      waitlistRepository,
      new GetPatientProfileByAccountIdUseCase(new FakePatientProfileRepository()),
    );

    const result = await useCase.execute(
      new CancelWaitlistEntryCommand({ waitlistEntryId: entry.getId(), callerAccountId: PATIENT_ACCOUNT_ID }),
    );

    assert.equal(result.getStatus(), 'cancelled');
    assert.equal(waitlistRepository.updated.length, 1);
  });

  it('throws NotFoundError (never a distinguishing 403) for another patient\'s entry', async () => {
    const entry = buildEntry(OTHER_PATIENT_ID);
    const useCase = new CancelWaitlistEntryUseCase(
      new FakeWaitlistEntryRepository(entry),
      new GetPatientProfileByAccountIdUseCase(new FakePatientProfileRepository()),
    );

    await assert.rejects(
      () => useCase.execute(new CancelWaitlistEntryCommand({ waitlistEntryId: entry.getId(), callerAccountId: PATIENT_ACCOUNT_ID })),
      NotFoundError,
    );
  });

  it('throws NotFoundError for a missing entry id', async () => {
    const useCase = new CancelWaitlistEntryUseCase(
      new FakeWaitlistEntryRepository(null),
      new GetPatientProfileByAccountIdUseCase(new FakePatientProfileRepository()),
    );

    await assert.rejects(
      () => useCase.execute(new CancelWaitlistEntryCommand({ waitlistEntryId: 'missing-id', callerAccountId: PATIENT_ACCOUNT_ID })),
      NotFoundError,
    );
  });
});
