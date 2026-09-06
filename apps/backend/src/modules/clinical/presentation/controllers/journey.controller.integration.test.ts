import assert from 'node:assert/strict';
import { before, describe, it } from 'node:test';

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
import { GetAppointmentsForDoctorAndPatientUseCase } from '../../../consultation/application/use-cases/get-appointments-for-doctor-and-patient/get-appointments-for-doctor-and-patient.use-case.js';
import { ListAppointmentsForDoctorUseCase } from '../../../consultation/application/use-cases/list-appointments-for-doctor/list-appointments-for-doctor.use-case.js';
import { Appointment } from '../../../consultation/domain/entities/appointment.entity.js';
import { ConsultationPricing } from '../../../consultation/domain/value-objects/consultation-pricing.value-object.js';
import type { AppointmentRepository } from '../../../consultation/domain/repositories/appointment.repository.js';
import { GetDoctorProfileByAccountIdUseCase } from '../../../doctor/application/use-cases/get-doctor-profile-by-account-id/get-doctor-profile-by-account-id.use-case.js';
import { DoctorProfile } from '../../../doctor/domain/entities/doctor-profile.entity.js';
import type { DoctorProfileRepository } from '../../../doctor/domain/repositories/doctor-profile.repository.js';
import { Account } from '../../../identity/domain/entities/account.entity.js';
import { AccountRole } from '../../../identity/domain/enums/account-role.enum.js';
import { DisplayName } from '../../../identity/domain/value-objects/display-name.value-object.js';
import { EmailAddress } from '../../../identity/domain/value-objects/email-address.value-object.js';
import { PatientProfile } from '../../../patient/domain/entities/patient-profile.entity.js';
import { ConsentScopeCategory } from '../../../reference/domain/entities/consent-scope-category.entity.js';
import type { ConsentScopeCategoryRepository } from '../../../reference/domain/repositories/consent-scope-category.repository.js';
import { GetConsentScopeCategoryByCodeUseCase } from '../../../reference/application/use-cases/get-consent-scope-category-by-code/get-consent-scope-category-by-code.use-case.js';
import { GetConsentStateUseCase } from '../../../trust/application/use-cases/get-consent-state/get-consent-state.use-case.js';
import { RevokeConsentCommand } from '../../../trust/application/use-cases/revoke-consent/revoke-consent.command.js';
import { RevokeConsentUseCase } from '../../../trust/application/use-cases/revoke-consent/revoke-consent.use-case.js';
import { RecordAuditLogUseCase } from '../../../trust/application/use-cases/record-audit-log/record-audit-log.use-case.js';
import type { AuditLog } from '../../../trust/domain/entities/audit-log.entity.js';
import { ConsentRecord } from '../../../trust/domain/entities/consent-record.entity.js';
import type { AuditLogRepository } from '../../../trust/domain/repositories/audit-log.repository.js';
import type { ConsentRecordRepository } from '../../../trust/domain/repositories/consent-record.repository.js';
import { GetHealthGraphByIdUseCase } from '../../application/use-cases/get-health-graph-by-id/get-health-graph-by-id.use-case.js';
import { GetHealthJourneyByIdUseCase } from '../../application/use-cases/get-health-journey-by-id/get-health-journey-by-id.use-case.js';
import { UpdateJourneyStageUseCase } from '../../application/use-cases/update-journey-stage/update-journey-stage.use-case.js';
import { HealthGraph } from '../../domain/entities/health-graph.entity.js';
import { HealthJourney } from '../../domain/entities/health-journey.entity.js';
import { CertaintyLevel } from '../../domain/enums/certainty-level.enum.js';
import { HealthGraphNodeType } from '../../domain/enums/health-graph-node-type.enum.js';
import { NodeSource } from '../../domain/enums/node-source.enum.js';
import type { HealthGraphRepository } from '../../domain/repositories/health-graph.repository.js';
import type { HealthJourneyRepository } from '../../domain/repositories/health-journey.repository.js';

import { JourneyController } from './journey.controller.js';

const DOCTOR_A_TOKEN = 'valid-doctor-a-token';
const DOCTOR_C_TOKEN = 'valid-doctor-c-token';
const PATIENT_TOKEN = 'valid-patient-token';

class InMemoryDoctorProfileRepository implements DoctorProfileRepository {
  private readonly byId = new Map<string, DoctorProfile>();
  private readonly byAccountId = new Map<string, DoctorProfile>();
  constructor(profiles: DoctorProfile[]) {
    for (const profile of profiles) {
      this.byId.set(profile.getId(), profile);
      this.byAccountId.set(profile.getAccountId(), profile);
    }
  }
  async findById(id: string): Promise<DoctorProfile | null> {
    return this.byId.get(id) ?? null;
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

class InMemoryHealthGraphRepository implements HealthGraphRepository {
  constructor(private readonly graph: HealthGraph) {}
  async findById(): Promise<HealthGraph | null> {
    return this.graph;
  }
  async findByPatientId(patientId: string): Promise<HealthGraph | null> {
    return this.graph.getPatientId() === patientId ? this.graph : null;
  }
  async save(): Promise<void> {}
}

class InMemoryHealthJourneyRepository implements HealthJourneyRepository {
  constructor(private readonly journey: HealthJourney) {}
  async findById(id: string): Promise<HealthJourney | null> {
    return this.journey.getId() === id ? this.journey : null;
  }
  async findByHealthGraphId(): Promise<HealthJourney[]> {
    return [this.journey];
  }
  async save(journey: HealthJourney): Promise<void> {
    // Mutates the same in-memory instance the test holds a reference to --
    // matches how the real Prisma repository's save() persists the entity's
    // own current state, and lets assertions read the journey's stage
    // straight off the fixture after a request.
    if (journey.getId() === this.journey.getId()) {
      Object.assign(this.journey, journey);
    }
  }
}

class InMemoryAuditLogRepository implements AuditLogRepository {
  public readonly recorded: AuditLog[] = [];
  async record(entry: AuditLog): Promise<void> {
    this.recorded.push(entry);
  }
}

const GENERAL_SCOPE = ConsentScopeCategory.reconstitute({
  id: '99999999-9999-4999-8999-999999999999',
  code: 'general',
  name: 'General Health Data',
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
});

class FakeConsentScopeCategoryRepository implements ConsentScopeCategoryRepository {
  async findAll() {
    return [GENERAL_SCOPE];
  }
  async findByCode(code: string) {
    return code === GENERAL_SCOPE.getCode() ? GENERAL_SCOPE : null;
  }
}

class InMemoryConsentRecordRepository implements ConsentRecordRepository {
  public readonly saved: ConsentRecord[] = [];
  async findCurrent(patientId: string, doctorId: string, scopeCategoryId: string): Promise<ConsentRecord | null> {
    const matches = this.saved.filter(
      (r) => r.getPatientId() === patientId && r.getDoctorId() === doctorId && r.getScopeCategoryId() === scopeCategoryId,
    );
    if (matches.length === 0) return null;
    return matches.reduce((latest, r) => (r.getVersionNumber() > latest.getVersionNumber() ? r : latest));
  }
  async findAllRevokedForPatient(): Promise<ConsentRecord[]> {
    return [];
  }
  async findAllForPatient(): Promise<ConsentRecord[]> {
    return this.saved;
  }
  async save(record: ConsentRecord): Promise<void> {
    this.saved.push(record);
  }
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

// Health Journey stage-advance fix (ORIVEX Remaining Work Audit, P0 C5):
// proves UpdateJourneyStageUseCase is finally reachable, gated by the same
// DOCTOR-OWNED ENCOUNTERS ONLY + consent check every other clinical
// read/write in this module already uses.
describe('JourneyController (integration)', () => {
  let app: INestApplication;
  let patient: PatientProfile;
  let doctorA: DoctorProfile;
  let journey: HealthJourney;
  let auditLogRepository: InMemoryAuditLogRepository;
  let consentRecordRepository: InMemoryConsentRecordRepository;
  let revokeConsentUseCase: RevokeConsentUseCase;

  before(async () => {
    const patientAccount = Account.register({
      email: EmailAddress.create('patient@example.com'),
      role: AccountRole.Patient,
      displayName: DisplayName.create('Nadia Fawzy'),
    });
    patient = PatientProfile.create({ accountId: patientAccount.getId().toString() });

    const doctorAAccount = Account.register({
      email: EmailAddress.create('doctor-a@example.com'),
      role: AccountRole.Doctor,
      displayName: DisplayName.create('Dr. A'),
    });
    doctorA = DoctorProfile.register({
      accountId: doctorAAccount.getId().toString(),
      licenseNumber: 'LIC-A',
      specialtyId: '11111111-1111-4111-8111-111111111111',
    });

    // Doctor C never appears in the appointment fixture below -- a real
    // account with a real DoctorProfile but zero appointments with the
    // patient.
    const doctorCAccount = Account.register({
      email: EmailAddress.create('doctor-c@example.com'),
      role: AccountRole.Doctor,
      displayName: DisplayName.create('Dr. C'),
    });
    const doctorC = DoctorProfile.register({
      accountId: doctorCAccount.getId().toString(),
      licenseNumber: 'LIC-C',
      specialtyId: '11111111-1111-4111-8111-111111111111',
    });

    const appointmentA = Appointment.request({
      patientId: patient.getId(),
      doctorId: doctorA.getId(),
      availabilityWindowId: '33333333-3333-4333-8333-333333333333',
      pricing: ConsultationPricing.free(),
      scheduledAt: new Date(Date.now() + 60 * 60_000),
    });
    appointmentA.confirm();

    const healthGraph = HealthGraph.create(patient.getId());
    const rootNode = healthGraph.addNode({
      nodeType: HealthGraphNodeType.Condition,
      freeTextDescription: 'Hypertension',
      certaintyLevel: CertaintyLevel.Confirmed,
      source: NodeSource.Clinical,
      authoringDoctorId: doctorA.getId(),
    });
    journey = HealthJourney.start(healthGraph.getId(), rootNode.getId());

    const appointmentRepository = new InMemoryAppointmentRepository([appointmentA]) as unknown as AppointmentRepository;
    const doctorProfileRepository = new InMemoryDoctorProfileRepository([doctorA, doctorC]);
    const healthGraphRepository = new InMemoryHealthGraphRepository(healthGraph);
    const healthJourneyRepository = new InMemoryHealthJourneyRepository(journey);
    auditLogRepository = new InMemoryAuditLogRepository();
    consentRecordRepository = new InMemoryConsentRecordRepository();
    const getConsentScopeCategoryByCodeUseCase = new GetConsentScopeCategoryByCodeUseCase(new FakeConsentScopeCategoryRepository());
    const getConsentStateUseCase = new GetConsentStateUseCase(consentRecordRepository, getConsentScopeCategoryByCodeUseCase);
    revokeConsentUseCase = new RevokeConsentUseCase(consentRecordRepository, getConsentScopeCategoryByCodeUseCase, new NoopDomainEventDispatcher());

    const moduleRef = await Test.createTestingModule({
      controllers: [JourneyController],
      providers: [
        PinoLoggerService,
        Reflector,
        JwtAuthGuard,
        RolesGuard,
        {
          provide: JWT_SIGNER,
          useFactory: () =>
            new FakeJwtSigner({
              [DOCTOR_A_TOKEN]: { accountId: doctorAAccount.getId().toString(), role: AccountRole.Doctor },
              [DOCTOR_C_TOKEN]: { accountId: doctorCAccount.getId().toString(), role: AccountRole.Doctor },
              [PATIENT_TOKEN]: { accountId: patientAccount.getId().toString(), role: AccountRole.Patient },
            }),
        },
        { provide: GetHealthJourneyByIdUseCase, useFactory: () => new GetHealthJourneyByIdUseCase(healthJourneyRepository) },
        { provide: GetHealthGraphByIdUseCase, useFactory: () => new GetHealthGraphByIdUseCase(healthGraphRepository) },
        {
          provide: UpdateJourneyStageUseCase,
          useFactory: () => new UpdateJourneyStageUseCase(healthJourneyRepository, new NoopDomainEventDispatcher()),
        },
        { provide: GetDoctorProfileByAccountIdUseCase, useFactory: () => new GetDoctorProfileByAccountIdUseCase(doctorProfileRepository) },
        {
          provide: GetAppointmentsForDoctorAndPatientUseCase,
          useFactory: () =>
            new GetAppointmentsForDoctorAndPatientUseCase(new ListAppointmentsForDoctorUseCase(appointmentRepository)),
        },
        { provide: GetConsentStateUseCase, useFactory: () => getConsentStateUseCase },
        { provide: RecordAuditLogUseCase, useFactory: () => new RecordAuditLogUseCase(auditLogRepository) },
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

  it('rejects a request with no bearer token', async () => {
    const response = await request(app.getHttpServer()).patch(`/journeys/${journey.getId()}`).send({ stage: 'follow_up' }).expect(401);
    assert.equal(response.body.error.code, 'UNAUTHORIZED');
  });

  it('rejects a patient (only the treating doctor may update a journey stage)', async () => {
    const response = await request(app.getHttpServer())
      .patch(`/journeys/${journey.getId()}`)
      .set('Authorization', `Bearer ${PATIENT_TOKEN}`)
      .send({ stage: 'follow_up' })
      .expect(403);
    assert.equal(response.body.error.code, 'FORBIDDEN');
  });

  it('gives a doctor with no relationship to the patient an ownership-safe not-found', async () => {
    const response = await request(app.getHttpServer())
      .patch(`/journeys/${journey.getId()}`)
      .set('Authorization', `Bearer ${DOCTOR_C_TOKEN}`)
      .send({ stage: 'follow_up' })
      .expect(404);
    assert.equal(response.body.error.code, 'NOT_FOUND');
  });

  it('rejects an invalid stage transition with 422, never silently accepting it', async () => {
    const response = await request(app.getHttpServer())
      .patch(`/journeys/${journey.getId()}`)
      .set('Authorization', `Bearer ${DOCTOR_A_TOKEN}`)
      .send({ stage: 'resolved' })
      .expect(422);
    assert.equal(response.body.error.code, 'VALIDATION_FAILED');
  });

  it("advances the treating doctor's journey stage, returns it, and records an audit log entry", async () => {
    const response = await request(app.getHttpServer())
      .patch(`/journeys/${journey.getId()}`)
      .set('Authorization', `Bearer ${DOCTOR_A_TOKEN}`)
      .send({ stage: 'follow_up' })
      .expect(200);

    assert.equal(response.body.data.id, journey.getId());
    assert.equal(response.body.data.stage, 'follow_up');
    assert.equal(journey.getStage(), 'follow_up');

    const entry = auditLogRepository.recorded.find((e) => e.getAction() === 'journey_stage_updated');
    assert.ok(entry, 'expected an audit log entry for this journey stage update');
    assert.equal(entry?.getActorAccountId(), doctorA.getAccountId());
    assert.equal(entry?.getSubjectId(), journey.getId());
  });

  it('blocks the treating doctor with 403 CONSENT_NOT_GRANTED once the patient revokes consent', async () => {
    await revokeConsentUseCase.execute(
      new RevokeConsentCommand({
        patientId: patient.getId(),
        doctorId: doctorA.getId(),
        scopeCode: 'general',
        legalBasisVersion: 'v1',
      }),
    );

    const response = await request(app.getHttpServer())
      .patch(`/journeys/${journey.getId()}`)
      .set('Authorization', `Bearer ${DOCTOR_A_TOKEN}`)
      .send({ stage: 'monitoring' })
      .expect(403);
    assert.equal(response.body.error.code, 'CONSENT_NOT_GRANTED');
  });
});
