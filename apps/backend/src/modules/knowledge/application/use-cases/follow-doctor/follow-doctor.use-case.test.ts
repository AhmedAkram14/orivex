import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { NotFoundError } from '../../../../../shared/errors/app-error.js';
import { GetPatientProfileByAccountIdUseCase } from '../../../../patient/application/use-cases/get-patient-profile-by-account-id/get-patient-profile-by-account-id.use-case.js';
import { PatientProfile } from '../../../../patient/domain/entities/patient-profile.entity.js';
import type { PatientProfileRepository } from '../../../../patient/domain/repositories/patient-profile.repository.js';
import { GetDoctorProfileByIdUseCase } from '../../../../doctor/application/use-cases/get-doctor-profile-by-id/get-doctor-profile-by-id.use-case.js';
import { DoctorProfile } from '../../../../doctor/domain/entities/doctor-profile.entity.js';
import type { DoctorProfileRepository } from '../../../../doctor/domain/repositories/doctor-profile.repository.js';
import { DoctorFollow } from '../../../domain/entities/doctor-follow.entity.js';
import type { DoctorFollowRepository } from '../../../domain/repositories/doctor-follow.repository.js';

import { FollowDoctorUseCase } from './follow-doctor.use-case.js';

const PATIENT_ACCOUNT_ID = '55555555-5555-4555-8555-555555555555';

class FakePatientProfileRepository implements PatientProfileRepository {
  constructor(private readonly profile: PatientProfile | null) {}
  async findById(): Promise<PatientProfile | null> {
    return this.profile;
  }
  async findByAccountId(): Promise<PatientProfile | null> {
    return this.profile;
  }
  async save(): Promise<void> {}
}

class FakeDoctorProfileRepository implements DoctorProfileRepository {
  constructor(private readonly profile: DoctorProfile | null) {}
  async findById(): Promise<DoctorProfile | null> {
    return this.profile;
  }
  async findByAccountId(): Promise<DoctorProfile | null> {
    return this.profile;
  }
  async save(): Promise<void> {}
}

class FakeDoctorFollowRepository implements DoctorFollowRepository {
  public saved: DoctorFollow[] = [];
  constructor(private readonly existing: DoctorFollow | null) {}
  async findByPatientAndDoctor(): Promise<DoctorFollow | null> {
    return this.existing;
  }
  async listByPatientId(): Promise<DoctorFollow[]> {
    return this.existing ? [this.existing] : [];
  }
  async save(follow: DoctorFollow): Promise<void> {
    this.saved.push(follow);
  }
  async delete(): Promise<void> {}
}

function buildPatientProfile(): PatientProfile {
  return PatientProfile.create({ accountId: PATIENT_ACCOUNT_ID });
}

function buildDoctorProfile(): DoctorProfile {
  return DoctorProfile.register({
    accountId: '11111111-1111-4111-8111-111111111111',
    licenseNumber: 'LIC-1',
    specialtyId: '33333333-3333-4333-8333-333333333333',
  });
}

describe('FollowDoctorUseCase', () => {
  it('creates a new follow when none exists', async () => {
    const patientProfile = buildPatientProfile();
    const doctorProfile = buildDoctorProfile();
    const followRepository = new FakeDoctorFollowRepository(null);
    const useCase = new FollowDoctorUseCase(
      followRepository,
      new GetPatientProfileByAccountIdUseCase(new FakePatientProfileRepository(patientProfile)),
      new GetDoctorProfileByIdUseCase(new FakeDoctorProfileRepository(doctorProfile)),
    );

    const result = await useCase.execute({ callerAccountId: PATIENT_ACCOUNT_ID, doctorId: doctorProfile.getId() });

    assert.equal(result.getPatientId(), patientProfile.getId());
    assert.equal(result.getDoctorId(), doctorProfile.getId());
    assert.equal(followRepository.saved.length, 1);
  });

  it('is idempotent: returns the existing follow rather than creating a duplicate', async () => {
    const patientProfile = buildPatientProfile();
    const doctorProfile = buildDoctorProfile();
    const existing = DoctorFollow.follow({ patientId: patientProfile.getId(), doctorId: doctorProfile.getId() });
    const followRepository = new FakeDoctorFollowRepository(existing);
    const useCase = new FollowDoctorUseCase(
      followRepository,
      new GetPatientProfileByAccountIdUseCase(new FakePatientProfileRepository(patientProfile)),
      new GetDoctorProfileByIdUseCase(new FakeDoctorProfileRepository(doctorProfile)),
    );

    const result = await useCase.execute({ callerAccountId: PATIENT_ACCOUNT_ID, doctorId: doctorProfile.getId() });

    assert.equal(result.getId(), existing.getId());
    assert.equal(followRepository.saved.length, 0);
  });

  it('throws NotFoundError when the caller has no patient profile', async () => {
    const doctorProfile = buildDoctorProfile();
    const useCase = new FollowDoctorUseCase(
      new FakeDoctorFollowRepository(null),
      new GetPatientProfileByAccountIdUseCase(new FakePatientProfileRepository(null)),
      new GetDoctorProfileByIdUseCase(new FakeDoctorProfileRepository(doctorProfile)),
    );

    await assert.rejects(
      () => useCase.execute({ callerAccountId: PATIENT_ACCOUNT_ID, doctorId: doctorProfile.getId() }),
      NotFoundError,
    );
  });

  it('throws NotFoundError when the target doctor does not exist', async () => {
    const patientProfile = buildPatientProfile();
    const useCase = new FollowDoctorUseCase(
      new FakeDoctorFollowRepository(null),
      new GetPatientProfileByAccountIdUseCase(new FakePatientProfileRepository(patientProfile)),
      new GetDoctorProfileByIdUseCase(new FakeDoctorProfileRepository(null)),
    );

    await assert.rejects(
      () => useCase.execute({ callerAccountId: PATIENT_ACCOUNT_ID, doctorId: 'missing-doctor-id' }),
      NotFoundError,
    );
  });
});
