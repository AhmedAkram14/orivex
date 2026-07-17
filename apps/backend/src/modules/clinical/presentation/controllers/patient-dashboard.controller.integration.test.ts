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
import { PatientProfile } from '../../../patient/domain/entities/patient-profile.entity.js';
import type { PatientProfileRepository } from '../../../patient/domain/repositories/patient-profile.repository.js';
import { PRESCRIPTION_REPOSITORY } from '../../application/ports/tokens.js';
import { Prescription } from '../../domain/entities/prescription.entity.js';
import type { PrescriptionRepository } from '../../domain/repositories/prescription.repository.js';

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

class InMemoryAppointmentRepository implements AppointmentRepository {
  constructor(private readonly appointments: Appointment[]) {}
  async findById(id: string): Promise<Appointment | null> {
    return this.appointments.find((a) => a.getId() === id) ?? null;
  }
  async findByPatientId(patientId: string): Promise<Appointment[]> {
    return this.appointments.filter((a) => a.getPatientId() === patientId);
  }
  async findByDoctorId(doctorId: string): Promise<Appointment[]> {
    return this.appointments.filter((a) => a.getDoctorId() === doctorId);
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
  let noProfilePatientAccountId: string;

  before(async () => {
    const patientAccount = Account.register({
      email: EmailAddress.create('patient@example.com'),
      role: AccountRole.Patient,
      displayName: DisplayName.create('Amina Youssef'),
    });
    const patient = PatientProfile.create({ accountId: patientAccount.getId().toString() });

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
      specialty: 'Cardiology',
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
          provide: PRESCRIPTION_REPOSITORY,
          useFactory: () => new InMemoryPrescriptionRepository([signedPrescription]),
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
});
