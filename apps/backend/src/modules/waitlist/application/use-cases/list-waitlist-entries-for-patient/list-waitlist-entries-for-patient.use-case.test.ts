import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { NotFoundError } from '../../../../../shared/errors/app-error.js';
import { GetPatientProfileByAccountIdUseCase } from '../../../../patient/application/use-cases/get-patient-profile-by-account-id/get-patient-profile-by-account-id.use-case.js';
import type { PatientProfile } from '../../../../patient/domain/entities/patient-profile.entity.js';
import type { PatientProfileRepository } from '../../../../patient/domain/repositories/patient-profile.repository.js';
import { WaitlistEntry } from '../../../domain/entities/waitlist-entry.entity.js';
import type { WaitlistEntryRepository } from '../../../domain/repositories/waitlist-entry.repository.js';

import { ListWaitlistEntriesForPatientUseCase } from './list-waitlist-entries-for-patient.use-case.js';

const PATIENT_ID = '11111111-1111-4111-8111-111111111111';
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
  constructor(private readonly entriesByPatientId: Map<string, WaitlistEntry[]>) {}
  async findById(): Promise<WaitlistEntry | null> {
    return null;
  }
  async listByPatientId(patientId: string): Promise<WaitlistEntry[]> {
    return this.entriesByPatientId.get(patientId) ?? [];
  }
  async hasActiveEntry(): Promise<boolean> {
    return false;
  }
  async claimEarliestEligibleEntry(): Promise<WaitlistEntry | null> {
    return null;
  }
  async save(): Promise<void> {}
  async update(): Promise<void> {}
}

function buildEntry(patientId: string): WaitlistEntry {
  const now = Date.now();
  return WaitlistEntry.join({
    patientId,
    doctorId: DOCTOR_ID,
    earliestAcceptableAt: new Date(now + 60_000),
    latestAcceptableAt: new Date(now + 30 * 24 * 60 * 60 * 1000),
  });
}

describe('ListWaitlistEntriesForPatientUseCase', () => {
  it("returns only the caller's own entries", async () => {
    const mine = buildEntry(PATIENT_ID);
    const entries = new Map([[PATIENT_ID, [mine]]]);
    const useCase = new ListWaitlistEntriesForPatientUseCase(
      new FakeWaitlistEntryRepository(entries),
      new GetPatientProfileByAccountIdUseCase(new FakePatientProfileRepository()),
    );

    const result = await useCase.execute({ callerAccountId: PATIENT_ACCOUNT_ID });

    assert.equal(result.length, 1);
    assert.equal(result[0]!.getId(), mine.getId());
  });

  it('throws NotFoundError when the caller has no patient profile', async () => {
    const useCase = new ListWaitlistEntriesForPatientUseCase(
      new FakeWaitlistEntryRepository(new Map()),
      new GetPatientProfileByAccountIdUseCase(new FakePatientProfileRepository()),
    );

    await assert.rejects(() => useCase.execute({ callerAccountId: 'no-such-account' }), NotFoundError);
  });
});
