import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';

import { Reflector } from '@nestjs/core';
import { type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';

import { AllExceptionsFilter } from '../../../../platform/filters/all-exceptions.filter.js';
import { PinoLoggerService } from '../../../../platform/logging/pino-logger.service.js';
import type { AccessTokenClaims, JwtSignerPort } from '../../../authentication/application/ports/jwt-signer.port.js';
import { JWT_SIGNER } from '../../../authentication/application/ports/tokens.js';
import { JwtAuthGuard } from '../../../authentication/presentation/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../../authentication/presentation/guards/roles.guard.js';
import { GetAppointmentsForDoctorAndPatientUseCase } from '../../../consultation/application/use-cases/get-appointments-for-doctor-and-patient/get-appointments-for-doctor-and-patient.use-case.js';
import { ListAppointmentsForDoctorUseCase } from '../../../consultation/application/use-cases/list-appointments-for-doctor/list-appointments-for-doctor.use-case.js';
import { TreatingRelationshipService } from '../../../consultation/application/services/treating-relationship.service.js';
import { Appointment } from '../../../consultation/domain/entities/appointment.entity.js';
import { ConsultationPricing } from '../../../consultation/domain/value-objects/consultation-pricing.value-object.js';
import type { AppointmentRepository } from '../../../consultation/domain/repositories/appointment.repository.js';
import { GetDoctorProfileByAccountIdUseCase } from '../../../doctor/application/use-cases/get-doctor-profile-by-account-id/get-doctor-profile-by-account-id.use-case.js';
import { DoctorProfile } from '../../../doctor/domain/entities/doctor-profile.entity.js';
import type { DoctorProfileRepository } from '../../../doctor/domain/repositories/doctor-profile.repository.js';
import { GetAccountByIdUseCase } from '../../../identity/application/use-cases/get-account-by-id/get-account-by-id.use-case.js';
import { Account } from '../../../identity/domain/entities/account.entity.js';
import { AccountRole } from '../../../identity/domain/enums/account-role.enum.js';
import type { AccountRepository } from '../../../identity/domain/repositories/account.repository.js';
import type { AccountId } from '../../../identity/domain/value-objects/account-id.value-object.js';
import { DisplayName } from '../../../identity/domain/value-objects/display-name.value-object.js';
import { EmailAddress } from '../../../identity/domain/value-objects/email-address.value-object.js';
import { GetPatientProfileByIdUseCase } from '../../application/use-cases/get-patient-profile-by-id/get-patient-profile-by-id.use-case.js';
import { ConfirmNoKnownAllergiesUseCase } from '../../application/use-cases/confirm-no-known-allergies/confirm-no-known-allergies.use-case.js';
import { PatientProfile } from '../../domain/entities/patient-profile.entity.js';
import type { PatientProfileRepository } from '../../domain/repositories/patient-profile.repository.js';
import { RecordAuditLogUseCase } from '../../../trust/application/use-cases/record-audit-log/record-audit-log.use-case.js';

import { DoctorPatientAllergiesController } from './doctor-patient-allergies.controller.js';

const DOCTOR_TOKEN = 'valid-doctor-token';
const DOCTOR_NO_RELATIONSHIP_TOKEN = 'valid-doctor-no-relationship-token';
const PATIENT_TOKEN = 'valid-patient-token';

class InMemoryDoctorProfileRepository implements DoctorProfileRepository {
  private readonly byAccountId = new Map<string, DoctorProfile>();
  constructor(profiles: DoctorProfile[]) {
    for (const profile of profiles) this.byAccountId.set(profile.getAccountId(), profile);
  }
  async findById(id: string): Promise<DoctorProfile | null> {
    return [...this.byAccountId.values()].find((p) => p.getId() === id) ?? null;
  }
  async findByAccountId(accountId: string): Promise<DoctorProfile | null> {
    return this.byAccountId.get(accountId) ?? null;
  }
  async save(): Promise<void> {}
}

class InMemoryAppointmentRepository implements Partial<AppointmentRepository> {
  constructor(private readonly appointments: Appointment[]) {}
  async findByDoctorId(doctorId: string): Promise<Appointment[]> {
    return this.appointments.filter((a) => a.getDoctorId() === doctorId);
  }
}

class InMemoryPatientProfileRepository implements PatientProfileRepository {
  constructor(private profile: PatientProfile) {}
  async findById(id: string): Promise<PatientProfile | null> {
    return this.profile.getId() === id ? this.profile : null;
  }
  async findByAccountId(accountId: string): Promise<PatientProfile | null> {
    return this.profile.getAccountId() === accountId ? this.profile : null;
  }
  async save(profile: PatientProfile): Promise<void> {
    this.profile = profile;
  }
}

class InMemoryAccountRepository implements AccountRepository {
  private readonly byId = new Map<string, Account>();
  constructor(accounts: Account[]) {
    for (const account of accounts) this.byId.set(account.getId().toString(), account);
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

class NoopDomainEventDispatcher {
  async dispatch(): Promise<void> {}
  subscribe(): void {}
}

class FakeJwtSigner implements JwtSignerPort {
  constructor(private readonly claimsByToken: Record<string, AccessTokenClaims>) {}
  async sign(): Promise<never> {
    throw new Error('not used in this test');
  }
  async verify(token: string): Promise<AccessTokenClaims> {
    const claims = this.claimsByToken[token];
    if (!claims) throw new Error('invalid token');
    return claims;
  }
}

// Doctor Patient Chart plan, 4.3: PATCH /patients/:id/allergies/confirm-none,
// doctor-only, authorized via the shared TreatingRelationshipService.
describe('DoctorPatientAllergiesController (integration)', () => {
  let app: INestApplication;
  let patient: PatientProfile;
  let patientProfileRepository: InMemoryPatientProfileRepository;
  let doctorId: string;

  before(async () => {
    const patientAccount = Account.register({
      email: EmailAddress.create('patient@example.com'),
      role: AccountRole.Patient,
      displayName: DisplayName.create('Nadia Fawzy'),
    });
    patient = PatientProfile.create({ accountId: patientAccount.getId().toString() });

    const doctorAccount = Account.register({
      email: EmailAddress.create('doctor@example.com'),
      role: AccountRole.Doctor,
      displayName: DisplayName.create('Dr. A'),
    });
    const doctor = DoctorProfile.register({
      accountId: doctorAccount.getId().toString(),
      licenseNumber: 'LIC-A',
      specialtyId: '11111111-1111-4111-8111-111111111111',
    });

    const doctorNoRelationshipAccount = Account.register({
      email: EmailAddress.create('doctor-no-relationship@example.com'),
      role: AccountRole.Doctor,
      displayName: DisplayName.create('Dr. B'),
    });
    const doctorNoRelationship = DoctorProfile.register({
      accountId: doctorNoRelationshipAccount.getId().toString(),
      licenseNumber: 'LIC-B',
      specialtyId: '11111111-1111-4111-8111-111111111111',
    });

    const appointment = Appointment.request({
      patientId: patient.getId(),
      doctorId: doctor.getId(),
      availabilityWindowId: '33333333-3333-4333-8333-333333333333',
      pricing: ConsultationPricing.free(),
      scheduledAt: new Date(Date.now() + 60 * 60_000),
    });
    appointment.confirm();

    doctorId = doctor.getId();
    const doctorProfileRepository = new InMemoryDoctorProfileRepository([doctor, doctorNoRelationship]);
    const appointmentRepository = new InMemoryAppointmentRepository([appointment]) as unknown as AppointmentRepository;
    patientProfileRepository = new InMemoryPatientProfileRepository(patient);
    const accountRepository = new InMemoryAccountRepository([patientAccount, doctorAccount, doctorNoRelationshipAccount]);

    const treatingRelationshipService = new TreatingRelationshipService(
      new GetDoctorProfileByAccountIdUseCase(doctorProfileRepository),
      new GetAppointmentsForDoctorAndPatientUseCase(new ListAppointmentsForDoctorUseCase(appointmentRepository)),
      new GetPatientProfileByIdUseCase(patientProfileRepository),
      new GetAccountByIdUseCase(accountRepository),
      { execute: async () => 'granted' } as never,
    );

    const moduleRef = await Test.createTestingModule({
      controllers: [DoctorPatientAllergiesController],
      providers: [
        PinoLoggerService,
        Reflector,
        JwtAuthGuard,
        RolesGuard,
        {
          provide: JWT_SIGNER,
          useFactory: () =>
            new FakeJwtSigner({
              [DOCTOR_TOKEN]: { accountId: doctorAccount.getId().toString(), role: AccountRole.Doctor },
              [DOCTOR_NO_RELATIONSHIP_TOKEN]: { accountId: doctorNoRelationshipAccount.getId().toString(), role: AccountRole.Doctor },
              [PATIENT_TOKEN]: { accountId: patientAccount.getId().toString(), role: AccountRole.Patient },
            }),
        },
        { provide: TreatingRelationshipService, useFactory: () => treatingRelationshipService },
        {
          provide: ConfirmNoKnownAllergiesUseCase,
          useFactory: () => new ConfirmNoKnownAllergiesUseCase(patientProfileRepository, new NoopDomainEventDispatcher()),
        },
        { provide: GetAccountByIdUseCase, useFactory: () => new GetAccountByIdUseCase(accountRepository) },
        { provide: RecordAuditLogUseCase, useValue: { execute: async () => {} } },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    app.useGlobalFilters(new AllExceptionsFilter(moduleRef.get(PinoLoggerService)));
    await app.init();
  });

  after(async () => {
    await app.close();
  });

  it('confirms no known allergies for a treating doctor and records who confirmed it', async () => {
    const response = await request(app.getHttpServer())
      .patch(`/patients/${patient.getId()}/allergies/confirm-none`)
      .set('Authorization', `Bearer ${DOCTOR_TOKEN}`)
      .expect(200);

    assert.ok(response.body.data.allergiesConfirmedNoneAt);
    assert.equal(response.body.data.allergiesConfirmedByDoctorId, doctorId);
    assert.equal(response.body.data.allergiesConfirmedByName, 'Dr. A');
  });

  it('a doctor with no relationship to the patient gets an ownership-safe 404', async () => {
    const response = await request(app.getHttpServer())
      .patch(`/patients/${patient.getId()}/allergies/confirm-none`)
      .set('Authorization', `Bearer ${DOCTOR_NO_RELATIONSHIP_TOKEN}`)
      .expect(404);

    assert.equal(response.body.error.code, 'NOT_FOUND');
  });

  it('a patient cannot call this doctor-only route', async () => {
    const response = await request(app.getHttpServer())
      .patch(`/patients/${patient.getId()}/allergies/confirm-none`)
      .set('Authorization', `Bearer ${PATIENT_TOKEN}`)
      .expect(403);

    assert.equal(response.body.error.code, 'FORBIDDEN');
  });
});
