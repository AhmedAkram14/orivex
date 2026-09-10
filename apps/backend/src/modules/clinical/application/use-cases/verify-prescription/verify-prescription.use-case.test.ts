import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { Account } from '../../../../identity/domain/entities/account.entity.js';
import { AccountRole } from '../../../../identity/domain/enums/account-role.enum.js';
import { DisplayName } from '../../../../identity/domain/value-objects/display-name.value-object.js';
import { EmailAddress } from '../../../../identity/domain/value-objects/email-address.value-object.js';
import type { AccountId } from '../../../../identity/domain/value-objects/account-id.value-object.js';
import type { AccountRepository } from '../../../../identity/domain/repositories/account.repository.js';
import { GetAccountByIdUseCase } from '../../../../identity/application/use-cases/get-account-by-id/get-account-by-id.use-case.js';
import { GetDoctorProfileByIdUseCase } from '../../../../doctor/application/use-cases/get-doctor-profile-by-id/get-doctor-profile-by-id.use-case.js';
import { DoctorProfile } from '../../../../doctor/domain/entities/doctor-profile.entity.js';
import type { DoctorProfileRepository } from '../../../../doctor/domain/repositories/doctor-profile.repository.js';
import { GetPatientProfileByIdUseCase } from '../../../../patient/application/use-cases/get-patient-profile-by-id/get-patient-profile-by-id.use-case.js';
import { PatientProfile } from '../../../../patient/domain/entities/patient-profile.entity.js';
import type { PatientProfileRepository } from '../../../../patient/domain/repositories/patient-profile.repository.js';
import { GetAppointmentByIdUseCase } from '../../../../consultation/application/use-cases/get-appointment-by-id/get-appointment-by-id.use-case.js';
import { GetConsultationSessionByIdUseCase } from '../../../../consultation/application/use-cases/get-consultation-session-by-id/get-consultation-session-by-id.use-case.js';
import { Appointment } from '../../../../consultation/domain/entities/appointment.entity.js';
import { ConsultationSession } from '../../../../consultation/domain/entities/consultation-session.entity.js';
import { ConsultationPricing } from '../../../../consultation/domain/value-objects/consultation-pricing.value-object.js';
import type { AppointmentRepository } from '../../../../consultation/domain/repositories/appointment.repository.js';
import type { ConsultationSessionRepository } from '../../../../consultation/domain/repositories/consultation-session.repository.js';
import { Prescription } from '../../../domain/entities/prescription.entity.js';
import type { PrescriptionRepository } from '../../../domain/repositories/prescription.repository.js';

import { VerifyPrescriptionUseCase } from './verify-prescription.use-case.js';

class FakeAccountRepository implements AccountRepository {
  constructor(private readonly accounts: Account[]) {}
  async findById(id: AccountId): Promise<Account | null> {
    return this.accounts.find((account) => account.getId().toString() === id.toString()) ?? null;
  }
  async findByEmail(): Promise<Account | null> {
    return null;
  }
  async findAll(): Promise<{ accounts: Account[]; total: number }> {
    return { accounts: this.accounts, total: this.accounts.length };
  }
  async save(): Promise<void> {}
}

class FakeDoctorProfileRepository implements DoctorProfileRepository {
  constructor(private readonly profile: DoctorProfile | null) {}
  async findById(): Promise<DoctorProfile | null> {
    return this.profile;
  }
  async findByAccountId(): Promise<DoctorProfile | null> {
    return null;
  }
  async save(): Promise<void> {}
}

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

class FakeAppointmentRepository implements AppointmentRepository {
  constructor(private readonly appointment: Appointment | null) {}
  async findById(): Promise<Appointment | null> {
    return this.appointment;
  }
  async findByPatientId(): Promise<Appointment[]> {
    return [];
  }
  async findByPatientIdPage(): Promise<Appointment[]> {
    return [];
  }
  async countByPatientId(): Promise<number> {
    return 0;
  }
  async findByDoctorId(): Promise<Appointment[]> {
    return [];
  }
  async findByDoctorIdForDateRange(): Promise<Appointment[]> {
    return [];
  }
  async countByDoctorIds(): Promise<Map<string, number>> {
    return new Map();
  }
  async countByStatusForDoctor(): Promise<Partial<Record<string, number>>> {
    return {};
  }
  async findConfirmedPastJoinWindowMissed(): Promise<Appointment[]> {
    return [];
  }
  async countFreeConsultationsForPatientSince(): Promise<number> {
    return 0;
  }
  async countNoShowsForPatient(): Promise<number> {
    return 0;
  }
  async save(): Promise<void> {}
}

class FakeConsultationSessionRepository implements ConsultationSessionRepository {
  constructor(private readonly session: ConsultationSession | null) {}
  async findById(): Promise<ConsultationSession | null> {
    return this.session;
  }
  async findByAppointmentId(): Promise<ConsultationSession | null> {
    return this.session;
  }
  async findStale(): Promise<ConsultationSession[]> {
    return [];
  }
  async save(): Promise<void> {}
}

class FakePrescriptionRepository implements PrescriptionRepository {
  constructor(private readonly prescription: Prescription | null) {}
  async findById(): Promise<Prescription | null> {
    return this.prescription;
  }
  async findByConsultationSessionId(): Promise<Prescription[]> {
    return this.prescription ? [this.prescription] : [];
  }
  async findByVerificationCode(): Promise<Prescription | null> {
    return this.prescription;
  }
  async save(): Promise<void> {}
}

function buildScenario() {
  const doctorAccount = Account.register({
    email: EmailAddress.create('doctor@example.com'),
    role: AccountRole.Doctor,
    displayName: DisplayName.create('Dr. Sarah Ahmed'),
  });
  const patientAccount = Account.register({
    email: EmailAddress.create('patient@example.com'),
    role: AccountRole.Patient,
    displayName: DisplayName.create('Amina Youssef'),
  });
  const doctorProfile = DoctorProfile.register({
    accountId: doctorAccount.getId().toString(),
    licenseNumber: 'LIC-9001',
    specialtyId: '11111111-1111-4111-8111-111111111111',
  });
  const patientProfile = PatientProfile.create({ accountId: patientAccount.getId().toString() });
  const appointment = Appointment.request({
    patientId: patientProfile.getId(),
    doctorId: doctorProfile.getId(),
    availabilityWindowId: '22222222-2222-4222-8222-222222222222',
    pricing: ConsultationPricing.free(),
    scheduledAt: new Date(Date.now() + 60 * 60_000),
  });
  const session = ConsultationSession.open(appointment.getId());
  const prescription = Prescription.sign({
    consultationSessionId: session.getId(),
    diagnosisNodeId: '33333333-3333-4333-8333-333333333333',
    authoringDoctorId: doctorProfile.getId(),
    signatureHash: 'test-signature-hash',
    verificationCode: 'TEST-CODE',
    signedAt: new Date(),
    lineItems: [
      { drugCatalogId: '44444444-4444-4444-8444-444444444444', drugName: 'Amoxicillin', dosage: '500mg', frequency: 'twice daily', durationDays: 7 },
    ],
  });

  return { doctorAccount, patientAccount, doctorProfile, patientProfile, appointment, session, prescription };
}

function buildUseCase(scenario: ReturnType<typeof buildScenario>, prescription: Prescription | null): VerifyPrescriptionUseCase {
  return new VerifyPrescriptionUseCase(
    new FakePrescriptionRepository(prescription),
    new GetDoctorProfileByIdUseCase(new FakeDoctorProfileRepository(scenario.doctorProfile)),
    new GetPatientProfileByIdUseCase(new FakePatientProfileRepository(scenario.patientProfile)),
    new GetAccountByIdUseCase(new FakeAccountRepository([scenario.doctorAccount, scenario.patientAccount])),
    new GetConsultationSessionByIdUseCase(new FakeConsultationSessionRepository(scenario.session)),
    new GetAppointmentByIdUseCase(new FakeAppointmentRepository(scenario.appointment)),
  );
}

describe('VerifyPrescriptionUseCase', () => {
  it('resolves a real signed prescription to doctor/patient identity and medications, never the diagnosis', async () => {
    const scenario = buildScenario();
    const useCase = buildUseCase(scenario, scenario.prescription);

    const result = await useCase.execute({ verificationCode: 'TEST-CODE' });

    assert.equal(result.valid, true);
    if (result.valid) {
      assert.equal(result.doctorName, 'Dr. Sarah Ahmed');
      assert.equal(result.doctorLicenseNumber, 'LIC-9001');
      assert.equal(result.patientName, 'Amina Youssef');
      assert.equal(result.lineItems.length, 1);
      assert.equal(result.lineItems[0]?.drugName, 'Amoxicillin');
      assert.ok(!('diagnosisNodeId' in result));
    }
  });

  it('returns invalid for an unknown code -- never an error', async () => {
    const scenario = buildScenario();
    const useCase = buildUseCase(scenario, null);

    const result = await useCase.execute({ verificationCode: 'BOGUS-CODE' });

    assert.deepEqual(result, { valid: false });
  });
});
