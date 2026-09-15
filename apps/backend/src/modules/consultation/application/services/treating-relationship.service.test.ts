import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { ForbiddenError, NotFoundError } from '../../../../shared/errors/app-error.js';
import { GetAccountByIdUseCase } from '../../../identity/application/use-cases/get-account-by-id/get-account-by-id.use-case.js';
import type { Account } from '../../../identity/domain/entities/account.entity.js';
import type { AccountRepository } from '../../../identity/domain/repositories/account.repository.js';
import { GetDoctorProfileByAccountIdUseCase } from '../../../doctor/application/use-cases/get-doctor-profile-by-account-id/get-doctor-profile-by-account-id.use-case.js';
import type { DoctorProfile } from '../../../doctor/domain/entities/doctor-profile.entity.js';
import type { DoctorProfileRepository } from '../../../doctor/domain/repositories/doctor-profile.repository.js';
import { GetPatientProfileByIdUseCase } from '../../../patient/application/use-cases/get-patient-profile-by-id/get-patient-profile-by-id.use-case.js';
import type { PatientProfile } from '../../../patient/domain/entities/patient-profile.entity.js';
import type { PatientProfileRepository } from '../../../patient/domain/repositories/patient-profile.repository.js';
import type { GetConsentStateUseCase } from '../../../trust/application/use-cases/get-consent-state/get-consent-state.use-case.js';
import { ConsentState } from '../../../trust/domain/enums/consent-state.enum.js';
import type { Appointment } from '../../domain/entities/appointment.entity.js';
import { GetAppointmentsForDoctorAndPatientUseCase } from '../use-cases/get-appointments-for-doctor-and-patient/get-appointments-for-doctor-and-patient.use-case.js';
import { ListAppointmentsForDoctorUseCase } from '../use-cases/list-appointments-for-doctor/list-appointments-for-doctor.use-case.js';

import { TreatingRelationshipService } from './treating-relationship.service.js';

const DOCTOR_ACCOUNT_ID = '11111111-1111-4111-8111-111111111111';
const DOCTOR_PROFILE_ID = '22222222-2222-4222-8222-222222222222';
const PATIENT_ID = '33333333-3333-4333-8333-333333333333';
const PATIENT_ACCOUNT_ID = '44444444-4444-4444-8444-444444444444';

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

class FakeAppointmentRepository {
  constructor(private readonly appointments: Appointment[]) {}
  async findByDoctorId(): Promise<Appointment[]> {
    return this.appointments;
  }
}

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

class FakeAccountRepository implements Partial<AccountRepository> {
  constructor(private readonly account: Account | null) {}
  async findById(): Promise<Account | null> {
    return this.account;
  }
}

function buildService(options: {
  doctorProfile: DoctorProfile | null;
  appointments: Appointment[];
  patientProfile: PatientProfile | null;
  account: Account | null;
  consentState: ConsentState;
}): TreatingRelationshipService {
  const getConsentStateUseCase = { execute: async () => options.consentState } as unknown as GetConsentStateUseCase;

  return new TreatingRelationshipService(
    new GetDoctorProfileByAccountIdUseCase(new FakeDoctorProfileRepository(options.doctorProfile)),
    new GetAppointmentsForDoctorAndPatientUseCase(
      new ListAppointmentsForDoctorUseCase(new FakeAppointmentRepository(options.appointments) as never),
    ),
    new GetPatientProfileByIdUseCase(new FakePatientProfileRepository(options.patientProfile)),
    new GetAccountByIdUseCase(new FakeAccountRepository(options.account) as unknown as AccountRepository),
    getConsentStateUseCase,
  );
}

describe('TreatingRelationshipService', () => {
  it('throws an ownership-safe NotFoundError when the caller has no doctor profile at all', async () => {
    const service = buildService({
      doctorProfile: null,
      appointments: [],
      patientProfile: null,
      account: null,
      consentState: ConsentState.Granted,
    });

    await assert.rejects(() => service.assertActiveRelationship(DOCTOR_ACCOUNT_ID, PATIENT_ID), NotFoundError);
  });

  it('throws NotFoundError when the doctor has never had an appointment with this patient', async () => {
    const doctorProfile = { getId: () => DOCTOR_PROFILE_ID, getAccountId: () => DOCTOR_ACCOUNT_ID } as DoctorProfile;
    const service = buildService({
      doctorProfile,
      appointments: [],
      patientProfile: null,
      account: null,
      consentState: ConsentState.Granted,
    });

    await assert.rejects(() => service.assertActiveRelationship(DOCTOR_ACCOUNT_ID, PATIENT_ID), NotFoundError);
  });

  it('throws a distinct ForbiddenError CONSENT_NOT_GRANTED when a real relationship has revoked consent', async () => {
    const doctorProfile = { getId: () => DOCTOR_PROFILE_ID, getAccountId: () => DOCTOR_ACCOUNT_ID } as DoctorProfile;
    const appointment = { getPatientId: () => PATIENT_ID, getDoctorId: () => DOCTOR_PROFILE_ID } as Appointment;
    const service = buildService({
      doctorProfile,
      appointments: [appointment],
      patientProfile: null,
      account: null,
      consentState: ConsentState.Revoked,
    });

    await assert.rejects(
      () => service.assertActiveRelationship(DOCTOR_ACCOUNT_ID, PATIENT_ID),
      (error: unknown) => {
        assert.ok(error instanceof ForbiddenError);
        assert.equal(error.code, 'CONSENT_NOT_GRANTED');
        return true;
      },
    );
  });

  it('resolves the full relationship result when a real, consented relationship exists', async () => {
    const doctorProfile = { getId: () => DOCTOR_PROFILE_ID, getAccountId: () => DOCTOR_ACCOUNT_ID } as DoctorProfile;
    const appointment = { getPatientId: () => PATIENT_ID, getDoctorId: () => DOCTOR_PROFILE_ID } as Appointment;
    const patientProfile = { getId: () => PATIENT_ID, getAccountId: () => PATIENT_ACCOUNT_ID } as PatientProfile;
    const account = { getId: () => ({ toString: () => PATIENT_ACCOUNT_ID }) } as unknown as Account;
    const service = buildService({
      doctorProfile,
      appointments: [appointment],
      patientProfile,
      account,
      consentState: ConsentState.Granted,
    });

    const result = await service.assertActiveRelationship(DOCTOR_ACCOUNT_ID, PATIENT_ID);

    assert.equal(result.doctorProfile, doctorProfile);
    assert.equal(result.profile, patientProfile);
    assert.equal(result.account, account);
    assert.deepEqual(result.ownAppointments, [appointment]);
  });
});
