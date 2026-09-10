import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { GetDoctorProfileByAccountIdUseCase } from '../../../../doctor/application/use-cases/get-doctor-profile-by-account-id/get-doctor-profile-by-account-id.use-case.js';
import type { DoctorProfile } from '../../../../doctor/domain/entities/doctor-profile.entity.js';
import type { DoctorProfileRepository } from '../../../../doctor/domain/repositories/doctor-profile.repository.js';
import { GetPatientProfileByAccountIdUseCase } from '../../../../patient/application/use-cases/get-patient-profile-by-account-id/get-patient-profile-by-account-id.use-case.js';
import type { PatientProfile } from '../../../../patient/domain/entities/patient-profile.entity.js';
import type { PatientProfileRepository } from '../../../../patient/domain/repositories/patient-profile.repository.js';
import { MessageThread } from '../../../domain/entities/message-thread.entity.js';
import type { MessageThreadRepository } from '../../../domain/repositories/message-thread.repository.js';

import { ListMessageThreadsForAccountUseCase } from './list-message-threads-for-account.use-case.js';

const PATIENT_ID = '11111111-1111-4111-8111-111111111111';
const DOCTOR_ID = '22222222-2222-4222-8222-222222222222';

class FakeMessageThreadRepository implements MessageThreadRepository {
  constructor(
    private readonly patientThreads: MessageThread[],
    private readonly doctorThreads: MessageThread[],
  ) {}
  async findById(): Promise<MessageThread | null> {
    return null;
  }
  async findByAppointmentId(): Promise<MessageThread | null> {
    return null;
  }
  async findByPatientId(patientId: string): Promise<MessageThread[]> {
    return patientId === PATIENT_ID ? this.patientThreads : [];
  }
  async findByDoctorId(doctorId: string): Promise<MessageThread[]> {
    return doctorId === DOCTOR_ID ? this.doctorThreads : [];
  }
  async save(): Promise<void> {}
}

class FakePatientProfileRepository implements PatientProfileRepository {
  constructor(private readonly profileByAccountId: Map<string, PatientProfile>) {}
  async findById(): Promise<PatientProfile | null> {
    return null;
  }
  async findByAccountId(accountId: string): Promise<PatientProfile | null> {
    return this.profileByAccountId.get(accountId) ?? null;
  }
  async save(): Promise<void> {}
}

class FakeDoctorProfileRepository implements DoctorProfileRepository {
  constructor(private readonly profileByAccountId: Map<string, DoctorProfile>) {}
  async findById(): Promise<DoctorProfile | null> {
    return null;
  }
  async findByAccountId(accountId: string): Promise<DoctorProfile | null> {
    return this.profileByAccountId.get(accountId) ?? null;
  }
  async save(): Promise<void> {}
}

function buildThread(): MessageThread {
  return MessageThread.start({
    appointmentId: '33333333-3333-4333-8333-333333333333',
    patientId: PATIENT_ID,
    doctorId: DOCTOR_ID,
  });
}

describe('ListMessageThreadsForAccountUseCase', () => {
  it("returns the caller's own threads when they are a patient", async () => {
    const thread = buildThread();
    const patientProfiles = new Map<string, PatientProfile>([['patient-account', { getId: () => PATIENT_ID } as PatientProfile]]);
    const useCase = new ListMessageThreadsForAccountUseCase(
      new FakeMessageThreadRepository([thread], []),
      new GetPatientProfileByAccountIdUseCase(new FakePatientProfileRepository(patientProfiles)),
      new GetDoctorProfileByAccountIdUseCase(new FakeDoctorProfileRepository(new Map())),
    );

    const threads = await useCase.execute({ callerAccountId: 'patient-account' });

    assert.equal(threads.length, 1);
    assert.equal(threads[0]?.getId(), thread.getId());
  });

  it('falls back to the doctor profile when the caller has no patient profile', async () => {
    const thread = buildThread();
    const doctorProfiles = new Map<string, DoctorProfile>([['doctor-account', { getId: () => DOCTOR_ID } as DoctorProfile]]);
    const useCase = new ListMessageThreadsForAccountUseCase(
      new FakeMessageThreadRepository([], [thread]),
      new GetPatientProfileByAccountIdUseCase(new FakePatientProfileRepository(new Map())),
      new GetDoctorProfileByAccountIdUseCase(new FakeDoctorProfileRepository(doctorProfiles)),
    );

    const threads = await useCase.execute({ callerAccountId: 'doctor-account' });

    assert.equal(threads.length, 1);
    assert.equal(threads[0]?.getId(), thread.getId());
  });

  it('returns an empty inbox for an account with neither profile', async () => {
    const useCase = new ListMessageThreadsForAccountUseCase(
      new FakeMessageThreadRepository([], []),
      new GetPatientProfileByAccountIdUseCase(new FakePatientProfileRepository(new Map())),
      new GetDoctorProfileByAccountIdUseCase(new FakeDoctorProfileRepository(new Map())),
    );

    const threads = await useCase.execute({ callerAccountId: 'stranger-account' });

    assert.deepEqual(threads, []);
  });
});
