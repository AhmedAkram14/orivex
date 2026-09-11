import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { NotFoundError } from '../../../../../shared/errors/app-error.js';
import { GetDoctorProfileByIdUseCase } from '../../../../doctor/application/use-cases/get-doctor-profile-by-id/get-doctor-profile-by-id.use-case.js';
import type { DoctorProfile } from '../../../../doctor/domain/entities/doctor-profile.entity.js';
import type { DoctorProfileRepository } from '../../../../doctor/domain/repositories/doctor-profile.repository.js';
import { GetPatientProfileByAccountIdUseCase } from '../../../../patient/application/use-cases/get-patient-profile-by-account-id/get-patient-profile-by-account-id.use-case.js';
import type { PatientProfile } from '../../../../patient/domain/entities/patient-profile.entity.js';
import type { PatientProfileRepository } from '../../../../patient/domain/repositories/patient-profile.repository.js';
import { WaitlistDomainError } from '../../../domain/exceptions/waitlist-domain.error.js';
import type { WaitlistEntry } from '../../../domain/entities/waitlist-entry.entity.js';
import type { WaitlistEntryRepository } from '../../../domain/repositories/waitlist-entry.repository.js';

import { JoinWaitlistCommand } from './join-waitlist.command.js';
import { JoinWaitlistUseCase } from './join-waitlist.use-case.js';

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

class FakeDoctorProfileRepository implements DoctorProfileRepository {
  constructor(private readonly exists: boolean) {}
  async findById(id: string): Promise<DoctorProfile | null> {
    return this.exists && id === DOCTOR_ID ? ({ getId: () => DOCTOR_ID } as DoctorProfile) : null;
  }
  async findByAccountId(): Promise<DoctorProfile | null> {
    return null;
  }
  async save(): Promise<void> {}
}

class FakeWaitlistEntryRepository implements WaitlistEntryRepository {
  public readonly saved: WaitlistEntry[] = [];
  constructor(private readonly alreadyActive = false) {}
  async findById(): Promise<WaitlistEntry | null> {
    return null;
  }
  async listByPatientId(): Promise<WaitlistEntry[]> {
    return [];
  }
  async hasActiveEntry(): Promise<boolean> {
    return this.alreadyActive;
  }
  async claimEarliestEligibleEntry(): Promise<WaitlistEntry | null> {
    return null;
  }
  async save(entry: WaitlistEntry): Promise<void> {
    this.saved.push(entry);
  }
  async update(): Promise<void> {}
}

function buildCommand(): JoinWaitlistCommand {
  const now = Date.now();
  return new JoinWaitlistCommand({
    callerAccountId: PATIENT_ACCOUNT_ID,
    doctorId: DOCTOR_ID,
    earliestAcceptableAt: new Date(now + 24 * 60 * 60 * 1000),
    latestAcceptableAt: new Date(now + 7 * 24 * 60 * 60 * 1000),
  });
}

describe('JoinWaitlistUseCase', () => {
  it('creates a Waiting entry for the caller\'s own patient profile', async () => {
    const waitlistRepository = new FakeWaitlistEntryRepository();
    const useCase = new JoinWaitlistUseCase(
      waitlistRepository,
      new GetPatientProfileByAccountIdUseCase(new FakePatientProfileRepository()),
      new GetDoctorProfileByIdUseCase(new FakeDoctorProfileRepository(true)),
    );

    const entry = await useCase.execute(buildCommand());

    assert.equal(entry.getPatientId(), PATIENT_ID);
    assert.equal(entry.getDoctorId(), DOCTOR_ID);
    assert.equal(waitlistRepository.saved.length, 1);
  });

  it('throws NotFoundError when the doctor does not exist', async () => {
    const useCase = new JoinWaitlistUseCase(
      new FakeWaitlistEntryRepository(),
      new GetPatientProfileByAccountIdUseCase(new FakePatientProfileRepository()),
      new GetDoctorProfileByIdUseCase(new FakeDoctorProfileRepository(false)),
    );

    await assert.rejects(() => useCase.execute(buildCommand()), NotFoundError);
  });

  it('throws WaitlistDomainError when the patient already has an active entry for this doctor', async () => {
    const useCase = new JoinWaitlistUseCase(
      new FakeWaitlistEntryRepository(true),
      new GetPatientProfileByAccountIdUseCase(new FakePatientProfileRepository()),
      new GetDoctorProfileByIdUseCase(new FakeDoctorProfileRepository(true)),
    );

    await assert.rejects(() => useCase.execute(buildCommand()), WaitlistDomainError);
  });
});
