import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';

import { Reflector } from '@nestjs/core';
import { ValidationPipe, type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';

import { AllExceptionsFilter } from '../../../../platform/filters/all-exceptions.filter.js';
import { PinoLoggerService } from '../../../../platform/logging/pino-logger.service.js';
import { createValidationException } from '../../../../platform/validation/validation-exception-factory.js';
import type { AccessTokenClaims, JwtSignerPort } from '../../../authentication/application/ports/jwt-signer.port.js';
import { JWT_SIGNER } from '../../../authentication/application/ports/tokens.js';
import { JwtAuthGuard } from '../../../authentication/presentation/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../../authentication/presentation/guards/roles.guard.js';
import { GetConsultationSessionByAppointmentIdUseCase } from '../../../consultation/application/use-cases/get-consultation-session-by-appointment-id/get-consultation-session-by-appointment-id.use-case.js';
import { ListAppointmentsForPatientUseCase } from '../../../consultation/application/use-cases/list-appointments-for-patient/list-appointments-for-patient.use-case.js';
import { Appointment } from '../../../consultation/domain/entities/appointment.entity.js';
import { ConsultationSession } from '../../../consultation/domain/entities/consultation-session.entity.js';
import { ConsultationType } from '../../../consultation/domain/enums/consultation-type.enum.js';
import type { AppointmentRepository } from '../../../consultation/domain/repositories/appointment.repository.js';
import type { ConsultationSessionRepository } from '../../../consultation/domain/repositories/consultation-session.repository.js';
import { GetDoctorProfileByIdUseCase } from '../../../doctor/application/use-cases/get-doctor-profile-by-id/get-doctor-profile-by-id.use-case.js';
import { DoctorProfile } from '../../../doctor/domain/entities/doctor-profile.entity.js';
import type { DoctorProfileRepository } from '../../../doctor/domain/repositories/doctor-profile.repository.js';
import { GetAccountByIdUseCase } from '../../../identity/application/use-cases/get-account-by-id/get-account-by-id.use-case.js';
import { Account } from '../../../identity/domain/entities/account.entity.js';
import { AccountRole } from '../../../identity/domain/enums/account-role.enum.js';
import type { AccountRepository } from '../../../identity/domain/repositories/account.repository.js';
import type { AccountId } from '../../../identity/domain/value-objects/account-id.value-object.js';
import { DisplayName } from '../../../identity/domain/value-objects/display-name.value-object.js';
import { EmailAddress } from '../../../identity/domain/value-objects/email-address.value-object.js';
import { GetPatientProfileByAccountIdUseCase } from '../../../patient/application/use-cases/get-patient-profile-by-account-id/get-patient-profile-by-account-id.use-case.js';
import { GetPatientProfileByIdUseCase } from '../../../patient/application/use-cases/get-patient-profile-by-id/get-patient-profile-by-id.use-case.js';
import { PatientProfile } from '../../../patient/domain/entities/patient-profile.entity.js';
import type { PatientProfileRepository } from '../../../patient/domain/repositories/patient-profile.repository.js';
import { ListClinicalNotesForConsultationSessionUseCase } from '../../application/use-cases/list-clinical-notes-for-consultation-session/list-clinical-notes-for-consultation-session.use-case.js';
import { ListPrescriptionsForConsultationSessionUseCase } from '../../application/use-cases/list-prescriptions-for-consultation-session/list-prescriptions-for-consultation-session.use-case.js';
import { GetHealthGraphSubgraphUseCase } from '../../application/use-cases/get-health-graph-subgraph/get-health-graph-subgraph.use-case.js';
import { ListVitalReadingsForPatientUseCase } from '../../application/use-cases/list-vital-readings-for-patient/list-vital-readings-for-patient.use-case.js';
import { ClinicalNote } from '../../domain/entities/clinical-note.entity.js';
import { HealthGraph } from '../../domain/entities/health-graph.entity.js';
import type { HealthGraphNode } from '../../domain/entities/health-graph-node.entity.js';
import { Prescription } from '../../domain/entities/prescription.entity.js';
import { PrescriptionLineItem } from '../../domain/entities/prescription-line-item.entity.js';
import { VitalReading } from '../../domain/entities/vital-reading.entity.js';
import { CertaintyLevel } from '../../domain/enums/certainty-level.enum.js';
import { HealthGraphNodeType } from '../../domain/enums/health-graph-node-type.enum.js';
import { NodeSource } from '../../domain/enums/node-source.enum.js';
import { PrescriptionStatus } from '../../domain/enums/prescription-status.enum.js';
import { VitalType } from '../../domain/enums/vital-type.enum.js';
import type { ClinicalNoteRepository } from '../../domain/repositories/clinical-note.repository.js';
import type { HealthGraphRepository } from '../../domain/repositories/health-graph.repository.js';
import type { PrescriptionRepository } from '../../domain/repositories/prescription.repository.js';
import type { VitalReadingRepository } from '../../domain/repositories/vital-reading.repository.js';
import { ListMedicalSpecialtiesUseCase } from '../../../reference/application/use-cases/list-medical-specialties/list-medical-specialties.use-case.js';
import { MedicalSpecialty } from '../../../reference/domain/entities/medical-specialty.entity.js';
import type { MedicalSpecialtyRepository } from '../../../reference/domain/repositories/medical-specialty.repository.js';

import { PatientDashboardController } from './patient-dashboard.controller.js';

const VALID_TOKEN = 'valid-patient-token';
const NO_PROFILE_TOKEN = 'valid-no-profile-token';

class InMemoryAccountRepository implements AccountRepository {
  private readonly byId = new Map<string, Account>();
  constructor(accounts: Account[]) {
    for (const account of accounts) {
      this.byId.set(account.getId().toString(), account);
    }
  }
  async findById(id: AccountId): Promise<Account | null> {
    return this.byId.get(id.toString()) ?? null;
  }
  async findByEmail(): Promise<Account | null> {
    return null;
  }

  findAll(): Promise<{ accounts: Account[]; total: number }> {
    return Promise.resolve({ accounts: [], total: 0 });
  }
  async save(): Promise<void> {}
}

class InMemoryPatientProfileRepository implements PatientProfileRepository {
  constructor(private readonly profile: PatientProfile | null) {}
  async findById(id: string): Promise<PatientProfile | null> {
    return this.profile && this.profile.getId() === id ? this.profile : null;
  }
  async findByAccountId(accountId: string): Promise<PatientProfile | null> {
    return this.profile && this.profile.getAccountId() === accountId ? this.profile : null;
  }
  async save(): Promise<void> {}
}

class InMemoryDoctorProfileRepository implements DoctorProfileRepository {
  private readonly byId = new Map<string, DoctorProfile>();
  constructor(profiles: DoctorProfile[]) {
    for (const profile of profiles) {
      this.byId.set(profile.getId(), profile);
    }
  }
  async findById(id: string): Promise<DoctorProfile | null> {
    return this.byId.get(id) ?? null;
  }
  async findByAccountId(): Promise<DoctorProfile | null> {
    return null;
  }
  async save(): Promise<void> {}
}

class InMemoryMedicalSpecialtyRepository implements MedicalSpecialtyRepository {
  constructor(private readonly specialties: MedicalSpecialty[]) {}
  async findAll(): Promise<MedicalSpecialty[]> {
    return this.specialties;
  }
  async findById(id: string): Promise<MedicalSpecialty | null> {
    return this.specialties.find((specialty) => specialty.getId() === id) ?? null;
  }
  async save(): Promise<void> {}
}

class InMemoryAppointmentRepository implements AppointmentRepository {
  constructor(private readonly appointments: Appointment[]) {}
  async findById(id: string): Promise<Appointment | null> {
    return this.appointments.find((a) => a.getId() === id) ?? null;
  }
  async findByPatientId(patientId: string): Promise<Appointment[]> {
    return this.appointments.filter((a) => a.getPatientId() === patientId);
  }
  async findByPatientIdPage(patientId: string, skip: number, take: number): Promise<Appointment[]> {
    return (await this.findByPatientId(patientId)).slice(skip, skip + take);
  }
  async countByPatientId(patientId: string): Promise<number> {
    return (await this.findByPatientId(patientId)).length;
  }
  async findByDoctorId(doctorId: string): Promise<Appointment[]> {
    return this.appointments.filter((a) => a.getDoctorId() === doctorId);
  }
  async findByDoctorIdForDateRange(doctorId: string): Promise<Appointment[]> {
    return this.findByDoctorId(doctorId);
  }
  async countByDoctorIds(): Promise<Map<string, number>> {
    return new Map();
  }
  async save(): Promise<void> {}
}

class InMemoryConsultationSessionRepository implements ConsultationSessionRepository {
  constructor(private readonly sessions: ConsultationSession[]) {}
  async findById(id: string): Promise<ConsultationSession | null> {
    return this.sessions.find((s) => s.getId() === id) ?? null;
  }
  async findByAppointmentId(appointmentId: string): Promise<ConsultationSession | null> {
    return this.sessions.find((s) => s.getAppointmentId() === appointmentId) ?? null;
  }
  async save(): Promise<void> {}
}

class InMemoryPrescriptionRepository implements PrescriptionRepository {
  constructor(private readonly prescriptions: Prescription[]) {}
  async findById(id: string): Promise<Prescription | null> {
    return this.prescriptions.find((p) => p.getId() === id) ?? null;
  }
  async findByConsultationSessionId(consultationSessionId: string): Promise<Prescription[]> {
    return this.prescriptions.filter((p) => p.getConsultationSessionId() === consultationSessionId);
  }
  async save(): Promise<void> {}
}

class InMemoryVitalReadingRepository implements VitalReadingRepository {
  constructor(private readonly readings: VitalReading[]) {}
  async findByPatientId(patientId: string): Promise<VitalReading[]> {
    return this.readings.filter((r) => r.getPatientId() === patientId);
  }
  async save(): Promise<void> {}
}

class InMemoryClinicalNoteRepository implements ClinicalNoteRepository {
  constructor(private readonly notes: ClinicalNote[]) {}
  async findById(id: string): Promise<ClinicalNote | null> {
    return this.notes.find((n) => n.getId() === id) ?? null;
  }
  async findByConsultationSessionId(consultationSessionId: string): Promise<ClinicalNote[]> {
    return this.notes.filter((n) => n.getConsultationSessionId() === consultationSessionId);
  }
  async save(): Promise<void> {}
}

class InMemoryHealthGraphRepository implements HealthGraphRepository {
  constructor(private readonly graph: HealthGraph | null) {}
  async findById(): Promise<HealthGraph | null> {
    return this.graph;
  }
  async findByPatientId(patientId: string): Promise<HealthGraph | null> {
    return this.graph && this.graph.getPatientId() === patientId ? this.graph : null;
  }
  async save(): Promise<void> {}
}

class FakeJwtSigner implements JwtSignerPort {
  constructor(private readonly accountIdByToken: Record<string, string>) {}
  async sign(): Promise<never> {
    throw new Error('not used in this test');
  }
  async verify(token: string): Promise<AccessTokenClaims> {
    const accountId = this.accountIdByToken[token];
    if (!accountId) {
      throw new Error('invalid token');
    }
    return { accountId, role: AccountRole.Patient };
  }
}

describe('PatientDashboardController (integration)', () => {
  let app: INestApplication;
  let doctorAccount: Account;
  let doctor: DoctorProfile;
  let confirmedAppointment: Appointment;
  let session: ConsultationSession;
  let signedPrescription: Prescription;
  let expiredPrescription: Prescription;
  let noProfilePatientAccountId: string;
  let clinicalNote: ClinicalNote;
  let conditionNode: HealthGraphNode;

  before(async () => {
    const patientAccount = Account.register({
      email: EmailAddress.create('patient@example.com'),
      role: AccountRole.Patient,
      displayName: DisplayName.create('Amina Youssef'),
    });
    const patient = PatientProfile.create({ accountId: patientAccount.getId().toString() });
    const weightReading = VitalReading.create({ patientId: patient.getId(), type: VitalType.Weight, value: 72 });

    const noProfilePatientAccount = Account.register({
      email: EmailAddress.create('no-profile@example.com'),
      role: AccountRole.Patient,
      displayName: DisplayName.create('No Profile'),
    });
    noProfilePatientAccountId = noProfilePatientAccount.getId().toString();

    doctorAccount = Account.register({
      email: EmailAddress.create('doctor@example.com'),
      role: AccountRole.Doctor,
      displayName: DisplayName.create('Dr. Karim Hassan'),
    });
    doctor = DoctorProfile.register({
      accountId: doctorAccount.getId().toString(),
      licenseNumber: 'LIC-1',
      specialtyId: '11111111-1111-4111-8111-111111111111',
    });

    confirmedAppointment = Appointment.request({
      patientId: patient.getId(),
      doctorId: doctor.getId(),
      availabilityWindowId: '33333333-3333-4333-8333-333333333333',
      consultationType: ConsultationType.Free,
      scheduledAt: new Date(Date.now() + 60 * 60_000),
    });
    confirmedAppointment.confirm();

    session = ConsultationSession.open(confirmedAppointment.getId());

    signedPrescription = Prescription.sign({
      consultationSessionId: session.getId(),
      diagnosisNodeId: '44444444-4444-4444-8444-444444444444',
      authoringDoctorId: doctor.getId(),
      lineItems: [
        {
          drugCatalogId: '55555555-5555-4555-8555-555555555555',
          drugName: 'Amlodipine 5mg',
          dosage: '5mg',
          frequency: 'once daily',
          durationDays: 30,
        },
      ],
    });

    const sixtyDaysAgo = new Date(Date.now() - 60 * 24 * 60 * 60_000);
    expiredPrescription = Prescription.reconstitute({
      id: '66666666-6666-4666-8666-666666666666',
      consultationSessionId: session.getId(),
      diagnosisNodeId: '44444444-4444-4444-8444-444444444444',
      authoringDoctorId: doctor.getId(),
      status: PrescriptionStatus.Signed,
      signedAt: sixtyDaysAgo,
      lineItems: [
        PrescriptionLineItem.reconstitute({
          id: '77777777-7777-4777-8777-777777777777',
          drugCatalogId: '88888888-8888-4888-8888-888888888888',
          drugName: 'Ibuprofen 200mg',
          dosage: '200mg',
          frequency: 'as needed',
          durationDays: 7,
          instructions: 'Take with food.',
        }),
      ],
      createdAt: sixtyDaysAgo,
      updatedAt: sixtyDaysAgo,
    });

    clinicalNote = ClinicalNote.author({
      consultationSessionId: session.getId(),
      authoringDoctorId: doctor.getId(),
      content: 'Patient reports improvement in symptoms.',
    });

    const healthGraph = HealthGraph.create(patient.getId());
    conditionNode = healthGraph.addNode({
      nodeType: HealthGraphNodeType.Condition,
      freeTextDescription: 'Hypertension',
      certaintyLevel: CertaintyLevel.Confirmed,
      source: NodeSource.Clinical,
      authoringDoctorId: doctor.getId(),
    });

    const moduleRef = await Test.createTestingModule({
      controllers: [PatientDashboardController],
      providers: [
        PinoLoggerService,
        Reflector,
        JwtAuthGuard,
        RolesGuard,
        {
          provide: JWT_SIGNER,
          useFactory: () =>
            new FakeJwtSigner({
              [VALID_TOKEN]: patientAccount.getId().toString(),
              [NO_PROFILE_TOKEN]: noProfilePatientAccountId,
            }),
        },
        {
          provide: GetPatientProfileByAccountIdUseCase,
          useFactory: () => new GetPatientProfileByAccountIdUseCase(new InMemoryPatientProfileRepository(patient)),
        },
        {
          provide: ListAppointmentsForPatientUseCase,
          useFactory: () =>
            new ListAppointmentsForPatientUseCase(new InMemoryAppointmentRepository([confirmedAppointment])),
        },
        {
          provide: GetDoctorProfileByIdUseCase,
          useFactory: () => new GetDoctorProfileByIdUseCase(new InMemoryDoctorProfileRepository([doctor])),
        },
        {
          provide: GetAccountByIdUseCase,
          useFactory: () => new GetAccountByIdUseCase(new InMemoryAccountRepository([patientAccount, doctorAccount])),
        },
        {
          provide: GetConsultationSessionByAppointmentIdUseCase,
          useFactory: () =>
            new GetConsultationSessionByAppointmentIdUseCase(new InMemoryConsultationSessionRepository([session])),
        },
        {
          provide: ListPrescriptionsForConsultationSessionUseCase,
          useFactory: () =>
            new ListPrescriptionsForConsultationSessionUseCase(
              new InMemoryPrescriptionRepository([signedPrescription, expiredPrescription]),
            ),
        },
        {
          provide: ListVitalReadingsForPatientUseCase,
          useFactory: () => new ListVitalReadingsForPatientUseCase(new InMemoryVitalReadingRepository([weightReading])),
        },
        {
          provide: ListClinicalNotesForConsultationSessionUseCase,
          useFactory: () => new ListClinicalNotesForConsultationSessionUseCase(new InMemoryClinicalNoteRepository([clinicalNote])),
        },
        {
          provide: GetHealthGraphSubgraphUseCase,
          useFactory: () =>
            new GetHealthGraphSubgraphUseCase(
              new InMemoryHealthGraphRepository(healthGraph),
              new GetPatientProfileByIdUseCase(new InMemoryPatientProfileRepository(patient)),
            ),
        },
        {
          provide: ListMedicalSpecialtiesUseCase,
          useFactory: () =>
            new ListMedicalSpecialtiesUseCase(
              new InMemoryMedicalSpecialtyRepository([
                MedicalSpecialty.reconstitute({
                  id: '11111111-1111-4111-8111-111111111111',
                  name: 'Cardiology',
                  isActive: true,
                  createdAt: new Date(),
                  updatedAt: new Date(),
                }),
              ]),
            ),
        },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        exceptionFactory: createValidationException,
      }),
    );
    app.useGlobalFilters(new AllExceptionsFilter(moduleRef.get(PinoLoggerService)));
    await app.init();
  });

  after(async () => {
    await app.close();
  });

  it('GET /patients/me/dashboard-summary rejects a request with no bearer token', async () => {
    const response = await request(app.getHttpServer()).get('/patients/me/dashboard-summary').expect(401);
    assert.equal(response.body.error.code, 'UNAUTHORIZED');
  });

  it('GET /patients/me/dashboard-summary returns an honest empty summary for an account with no patient profile', async () => {
    const response = await request(app.getHttpServer())
      .get('/patients/me/dashboard-summary')
      .set('Authorization', `Bearer ${NO_PROFILE_TOKEN}`)
      .expect(200);

    assert.equal(response.body.data.upcomingAppointmentsCount, 0);
    assert.equal(response.body.data.activePrescriptionsCount, 0);
    assert.equal(response.body.data.lastVisitAt, undefined);
  });

  it('GET /patients/me/upcoming-appointments returns an empty list for an account with no patient profile', async () => {
    const response = await request(app.getHttpServer())
      .get('/patients/me/upcoming-appointments')
      .set('Authorization', `Bearer ${NO_PROFILE_TOKEN}`)
      .expect(200);

    assert.deepEqual(response.body.data, []);
  });

  it('GET /patients/me/dashboard-summary reflects the confirmed appointment and signed prescription', async () => {
    const response = await request(app.getHttpServer())
      .get('/patients/me/dashboard-summary')
      .set('Authorization', `Bearer ${VALID_TOKEN}`)
      .expect(200);

    assert.equal(response.body.data.upcomingAppointmentsCount, 1);
    assert.equal(response.body.data.activePrescriptionsCount, 1);
  });

  it('GET /patients/me/upcoming-appointments returns the confirmed appointment composed with the doctor name', async () => {
    const response = await request(app.getHttpServer())
      .get('/patients/me/upcoming-appointments')
      .set('Authorization', `Bearer ${VALID_TOKEN}`)
      .expect(200);

    assert.equal(response.body.data.length, 1);
    assert.equal(response.body.data[0].id, confirmedAppointment.getId());
    assert.equal(response.body.data[0].doctorName, 'Dr. Karim Hassan');
    assert.equal(response.body.data[0].specialization, 'Cardiology');
    assert.equal(response.body.data[0].status, 'upcoming');
  });

  it('GET /patients/me/active-prescriptions returns the signed prescription composed with the prescribing doctor', async () => {
    const response = await request(app.getHttpServer())
      .get('/patients/me/active-prescriptions')
      .set('Authorization', `Bearer ${VALID_TOKEN}`)
      .expect(200);

    assert.equal(response.body.data.length, 1);
    assert.equal(response.body.data[0].id, signedPrescription.getId());
    assert.equal(response.body.data[0].medicationName, 'Amlodipine 5mg');
    assert.equal(response.body.data[0].dosageLabel, '5mg, once daily');
    assert.equal(response.body.data[0].prescribedBy, 'Dr. Karim Hassan');
    assert.equal(response.body.data[0].status, 'active');
  });

  it('GET /patients/me/prescriptions rejects a request with no bearer token', async () => {
    const response = await request(app.getHttpServer()).get('/patients/me/prescriptions').expect(401);
    assert.equal(response.body.error.code, 'UNAUTHORIZED');
  });

  it('GET /patients/me/prescriptions returns an empty list for an account with no patient profile', async () => {
    const response = await request(app.getHttpServer())
      .get('/patients/me/prescriptions')
      .set('Authorization', `Bearer ${NO_PROFILE_TOKEN}`)
      .expect(200);

    assert.deepEqual(response.body.data, []);
  });

  it('GET /patients/me/prescriptions returns both the active and expired prescriptions with correct status', async () => {
    const response = await request(app.getHttpServer())
      .get('/patients/me/prescriptions')
      .set('Authorization', `Bearer ${VALID_TOKEN}`)
      .expect(200);

    assert.equal(response.body.data.length, 2);

    const active = response.body.data.find((item: { id: string }) => item.id === signedPrescription.getId());
    assert.ok(active);
    assert.equal(active.medicationName, 'Amlodipine 5mg');
    assert.equal(active.dosageAmount, '5mg');
    assert.equal(active.frequencyLabel, 'once daily');
    assert.equal(active.prescribedBy, 'Dr. Karim Hassan');
    assert.equal(active.status, 'active');

    const expired = response.body.data.find((item: { id: string }) => item.id === expiredPrescription.getId());
    assert.ok(expired);
    assert.equal(expired.medicationName, 'Ibuprofen 200mg');
    assert.equal(expired.dosageAmount, '200mg');
    assert.equal(expired.frequencyLabel, 'as needed');
    assert.equal(expired.status, 'expired');
    assert.equal(expired.instructions, 'Take with food.');
  });

  it('GET /patients/me/health-dashboard rejects a request with no bearer token', async () => {
    const response = await request(app.getHttpServer()).get('/patients/me/health-dashboard').expect(401);
    assert.equal(response.body.error.code, 'UNAUTHORIZED');
  });

  it('GET /patients/me/health-dashboard returns all 3 vital types empty for an account with no patient profile', async () => {
    const response = await request(app.getHttpServer())
      .get('/patients/me/health-dashboard')
      .set('Authorization', `Bearer ${NO_PROFILE_TOKEN}`)
      .expect(200);

    assert.equal(response.body.data.length, 3);
    assert.ok(response.body.data.every((summary: { readings: unknown[] }) => summary.readings.length === 0));
  });

  it('GET /patients/me/health-dashboard reflects the recorded weight reading and leaves the other 2 types honestly empty', async () => {
    const response = await request(app.getHttpServer())
      .get('/patients/me/health-dashboard')
      .set('Authorization', `Bearer ${VALID_TOKEN}`)
      .expect(200);

    assert.equal(response.body.data.length, 3);
    const weightSummary = response.body.data.find((summary: { type: string }) => summary.type === 'weight');
    assert.equal(weightSummary.readings.length, 1);
    assert.equal(weightSummary.latest.value, 72);
    assert.equal(weightSummary.latest.valueLabel, '72 kg');

    const bloodPressureSummary = response.body.data.find(
      (summary: { type: string }) => summary.type === 'blood-pressure',
    );
    assert.equal(bloodPressureSummary.readings.length, 0);
    assert.equal(bloodPressureSummary.latest, undefined);
  });

  it('GET /patients/me/medical-records rejects a request with no bearer token', async () => {
    const response = await request(app.getHttpServer()).get('/patients/me/medical-records').expect(401);
    assert.equal(response.body.error.code, 'UNAUTHORIZED');
  });

  it('GET /patients/me/medical-records returns an empty list for an account with no patient profile', async () => {
    const response = await request(app.getHttpServer())
      .get('/patients/me/medical-records')
      .set('Authorization', `Bearer ${NO_PROFILE_TOKEN}`)
      .expect(200);

    assert.deepEqual(response.body.data, []);
  });

  it('GET /patients/me/medical-records returns both the clinical note and the condition node, sorted most-recent-first', async () => {
    const response = await request(app.getHttpServer())
      .get('/patients/me/medical-records')
      .set('Authorization', `Bearer ${VALID_TOKEN}`)
      .expect(200);

    assert.equal(response.body.data.length, 2);

    const visit = response.body.data.find((item: { id: string }) => item.id === clinicalNote.getId());
    assert.ok(visit);
    assert.equal(visit.type, 'visit');
    assert.equal(visit.title, 'Clinical visit');
    assert.equal(visit.description, 'Patient reports improvement in symptoms.');
    assert.equal(visit.doctorName, 'Dr. Karim Hassan');

    const condition = response.body.data.find((item: { id: string }) => item.id === conditionNode.getId());
    assert.ok(condition);
    assert.equal(condition.type, 'condition');
    assert.equal(condition.title, 'Hypertension');
    assert.equal(condition.doctorName, 'Dr. Karim Hassan');

    const dates = response.body.data.map((item: { date: string }) => new Date(item.date).getTime());
    assert.ok(dates[0] >= dates[1], 'entries should be sorted most-recent-first');
  });
});
