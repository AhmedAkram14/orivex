import assert from 'node:assert/strict';
import { before, describe, it } from 'node:test';

import { Reflector } from '@nestjs/core';
import { ValidationPipe, type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';

import { AllExceptionsFilter } from '../../../../platform/filters/all-exceptions.filter.js';
import { PinoLoggerService } from '../../../../platform/logging/pino-logger.service.js';
import { createValidationException } from '../../../../platform/validation/validation-exception-factory.js';
import { DOMAIN_EVENT_DISPATCHER } from '../../../../shared/domain/tokens.js';
import type { AccessTokenClaims, JwtSignerPort } from '../../../authentication/application/ports/jwt-signer.port.js';
import { JWT_SIGNER } from '../../../authentication/application/ports/tokens.js';
import { JwtAuthGuard } from '../../../authentication/presentation/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../../authentication/presentation/guards/roles.guard.js';
import { GetAppointmentByIdUseCase } from '../../../consultation/application/use-cases/get-appointment-by-id/get-appointment-by-id.use-case.js';
import { GetConsultationSessionByIdUseCase } from '../../../consultation/application/use-cases/get-consultation-session-by-id/get-consultation-session-by-id.use-case.js';
import { Appointment } from '../../../consultation/domain/entities/appointment.entity.js';
import { ConsultationSession } from '../../../consultation/domain/entities/consultation-session.entity.js';
import { ConsultationType } from '../../../consultation/domain/enums/consultation-type.enum.js';
import type { AppointmentRepository } from '../../../consultation/domain/repositories/appointment.repository.js';
import type { ConsultationSessionRepository } from '../../../consultation/domain/repositories/consultation-session.repository.js';
import { GetDoctorProfileByAccountIdUseCase } from '../../../doctor/application/use-cases/get-doctor-profile-by-account-id/get-doctor-profile-by-account-id.use-case.js';
import { GetDoctorProfileByIdUseCase } from '../../../doctor/application/use-cases/get-doctor-profile-by-id/get-doctor-profile-by-id.use-case.js';
import { DoctorProfile } from '../../../doctor/domain/entities/doctor-profile.entity.js';
import type { DoctorProfileRepository } from '../../../doctor/domain/repositories/doctor-profile.repository.js';
import { AccountRole } from '../../../identity/domain/enums/account-role.enum.js';
import { GetPatientProfileByAccountIdUseCase } from '../../../patient/application/use-cases/get-patient-profile-by-account-id/get-patient-profile-by-account-id.use-case.js';
import { GetPatientProfileByIdUseCase } from '../../../patient/application/use-cases/get-patient-profile-by-id/get-patient-profile-by-id.use-case.js';
import { PatientProfile } from '../../../patient/domain/entities/patient-profile.entity.js';
import type { PatientProfileRepository } from '../../../patient/domain/repositories/patient-profile.repository.js';
import { GetHealthGraphSubgraphUseCase } from '../../application/use-cases/get-health-graph-subgraph/get-health-graph-subgraph.use-case.js';
import { GetPrescriptionByIdUseCase } from '../../application/use-cases/get-prescription-by-id/get-prescription-by-id.use-case.js';
import { SignPrescriptionUseCase } from '../../application/use-cases/sign-prescription/sign-prescription.use-case.js';
import type { HealthGraphNode } from '../../domain/entities/health-graph-node.entity.js';
import { HealthGraph } from '../../domain/entities/health-graph.entity.js';
import { HealthGraphNodeType } from '../../domain/enums/health-graph-node-type.enum.js';
import type { Prescription } from '../../domain/entities/prescription.entity.js';
import type { HealthGraphRepository } from '../../domain/repositories/health-graph.repository.js';
import type { PendingAISuggestionAcknowledgmentRepository } from '../../domain/repositories/pending-ai-suggestion-acknowledgment.repository.js';
import type { PrescriptionRepository } from '../../domain/repositories/prescription.repository.js';

import { PrescriptionController } from './prescription.controller.js';

const DOCTOR_TOKEN = 'valid-doctor-token';
const OTHER_DOCTOR_TOKEN = 'valid-other-doctor-token';
const PATIENT_TOKEN = 'valid-patient-token';
const OTHER_PATIENT_TOKEN = 'valid-other-patient-token';

class InMemoryPatientProfileRepository implements PatientProfileRepository {
  constructor(private readonly profile: PatientProfile) {}
  async findById(id: string): Promise<PatientProfile | null> {
    return this.profile.getId() === id ? this.profile : null;
  }
  async findByAccountId(accountId: string): Promise<PatientProfile | null> {
    return this.profile.getAccountId() === accountId ? this.profile : null;
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
  async findByAccountId(accountId: string): Promise<DoctorProfile | null> {
    for (const profile of this.byId.values()) {
      if (profile.getAccountId() === accountId) {
        return profile;
      }
    }
    return null;
  }
  async save(): Promise<void> {}
}

class FakeJwtSigner implements JwtSignerPort {
  constructor(private readonly tokens: Map<string, AccessTokenClaims>) {}
  async sign(): Promise<never> {
    throw new Error('not used in this test');
  }
  async verify(token: string): Promise<AccessTokenClaims> {
    const claims = this.tokens.get(token);
    if (!claims) {
      throw new Error('invalid token');
    }
    return claims;
  }
}

class InMemoryConsultationSessionRepository implements ConsultationSessionRepository {
  constructor(private readonly session: ConsultationSession) {}
  async findById(id: string): Promise<ConsultationSession | null> {
    return this.session.getId() === id ? this.session : null;
  }
  async findByAppointmentId(): Promise<ConsultationSession | null> {
    return null;
  }
  async save(): Promise<void> {}
}

class InMemoryAppointmentRepository implements AppointmentRepository {
  constructor(private readonly appointment: Appointment) {}
  async findById(id: string): Promise<Appointment | null> {
    return this.appointment.getId() === id ? this.appointment : null;
  }
  async findByPatientId(patientId: string): Promise<Appointment[]> {
    return this.appointment.getPatientId() === patientId ? [this.appointment] : [];
  }
  async findByPatientIdPage(patientId: string, skip: number, take: number): Promise<Appointment[]> {
    return (await this.findByPatientId(patientId)).slice(skip, skip + take);
  }
  async countByPatientId(patientId: string): Promise<number> {
    return (await this.findByPatientId(patientId)).length;
  }
  async findByDoctorId(doctorId: string): Promise<Appointment[]> {
    return this.appointment.getDoctorId() === doctorId ? [this.appointment] : [];
  }
  async findByDoctorIdForDateRange(doctorId: string): Promise<Appointment[]> {
    return this.findByDoctorId(doctorId);
  }
  async countByDoctorIds(): Promise<Map<string, number>> {
    return new Map();
  }
  async save(): Promise<void> {}
}

class InMemoryHealthGraphRepository implements HealthGraphRepository {
  constructor(private readonly graph: HealthGraph) {}
  async findById(): Promise<HealthGraph | null> {
    return this.graph;
  }
  async findByPatientId(): Promise<HealthGraph | null> {
    return this.graph;
  }
  async save(): Promise<void> {}
}

class InMemoryPrescriptionRepository implements PrescriptionRepository {
  private readonly byId = new Map<string, Prescription>();
  async findById(id: string): Promise<Prescription | null> {
    return this.byId.get(id) ?? null;
  }
  async findByConsultationSessionId(consultationSessionId: string): Promise<Prescription[]> {
    return [...this.byId.values()].filter((p) => p.getConsultationSessionId() === consultationSessionId);
  }
  async save(prescription: Prescription): Promise<void> {
    this.byId.set(prescription.getId(), prescription);
  }
}

class NoopDomainEventDispatcher {
  async dispatch(): Promise<void> {
    // intentionally empty
  }

  subscribe(): void {}
}

class InMemoryPendingAISuggestionAcknowledgmentRepository implements PendingAISuggestionAcknowledgmentRepository {
  async createPending(): Promise<void> {}
  async acknowledge(): Promise<void> {}
  async hasUnacknowledged(): Promise<boolean> {
    return false;
  }
}

describe('PrescriptionController (integration)', () => {
  let app: INestApplication;
  let doctor: DoctorProfile;
  let otherDoctor: DoctorProfile;
  let session: ConsultationSession;
  let node: HealthGraphNode;
  let signedPrescriptionId: string;

  before(async () => {
    const patient = PatientProfile.create({ accountId: '11111111-1111-4111-8111-111111111111' });
    const otherPatient = PatientProfile.create({ accountId: '77777777-7777-4777-8777-777777777777' });
    doctor = DoctorProfile.register({
      accountId: '22222222-2222-4222-8222-222222222222',
      licenseNumber: 'LIC-1',
      specialtyId: '11111111-1111-4111-8111-111111111111',
    });
    otherDoctor = DoctorProfile.register({
      accountId: '55555555-5555-4555-8555-555555555555',
      licenseNumber: 'LIC-2',
      specialtyId: '11111111-1111-4111-8111-111111111111',
    });
    const appointment = Appointment.request({
      patientId: patient.getId(),
      doctorId: doctor.getId(),
      availabilityWindowId: '33333333-3333-4333-8333-333333333333',
      consultationType: ConsultationType.Free,
      scheduledAt: new Date(Date.now() + 60 * 60_000),
    });
    session = ConsultationSession.open(appointment.getId());
    const graph = HealthGraph.create(patient.getId());
    node = graph.addNode({ nodeType: HealthGraphNodeType.Condition, authoringDoctorId: doctor.getId() });

    const doctorProfileRepo = new InMemoryDoctorProfileRepository([doctor, otherDoctor]);
    const patientProfileRepo = new InMemoryPatientProfileRepository(patient);

    const prescriptionRepo = new InMemoryPrescriptionRepository();
    const signPrescriptionUseCase = new SignPrescriptionUseCase(
      prescriptionRepo,
      new NoopDomainEventDispatcher(),
      new GetConsultationSessionByIdUseCase(new InMemoryConsultationSessionRepository(session)),
      new GetAppointmentByIdUseCase(new InMemoryAppointmentRepository(appointment)),
      new GetDoctorProfileByIdUseCase(doctorProfileRepo),
      new GetHealthGraphSubgraphUseCase(
        new InMemoryHealthGraphRepository(graph),
        new GetPatientProfileByIdUseCase(patientProfileRepo),
      ),
      new InMemoryPendingAISuggestionAcknowledgmentRepository(),
    );
    const getPrescriptionByIdUseCase = new GetPrescriptionByIdUseCase(prescriptionRepo);

    const jwtSigner = new FakeJwtSigner(
      new Map([
        [DOCTOR_TOKEN, { accountId: doctor.getAccountId(), role: AccountRole.Doctor }],
        [OTHER_DOCTOR_TOKEN, { accountId: otherDoctor.getAccountId(), role: AccountRole.Doctor }],
        [PATIENT_TOKEN, { accountId: patient.getAccountId(), role: AccountRole.Patient }],
        [OTHER_PATIENT_TOKEN, { accountId: otherPatient.getAccountId(), role: AccountRole.Patient }],
      ]),
    );

    const moduleRef = await Test.createTestingModule({
      controllers: [PrescriptionController],
      providers: [
        PinoLoggerService,
        Reflector,
        JwtAuthGuard,
        RolesGuard,
        { provide: JWT_SIGNER, useFactory: () => jwtSigner },
        { provide: DOMAIN_EVENT_DISPATCHER, useClass: NoopDomainEventDispatcher },
        { provide: SignPrescriptionUseCase, useValue: signPrescriptionUseCase },
        { provide: GetPrescriptionByIdUseCase, useValue: getPrescriptionByIdUseCase },
        { provide: GetDoctorProfileByAccountIdUseCase, useFactory: () => new GetDoctorProfileByAccountIdUseCase(doctorProfileRepo) },
        { provide: GetPatientProfileByAccountIdUseCase, useFactory: () => new GetPatientProfileByAccountIdUseCase(patientProfileRepo) },
        { provide: GetConsultationSessionByIdUseCase, useValue: new GetConsultationSessionByIdUseCase(new InMemoryConsultationSessionRepository(session)) },
        { provide: GetAppointmentByIdUseCase, useValue: new GetAppointmentByIdUseCase(new InMemoryAppointmentRepository(appointment)) },
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

  it('POST /prescriptions rejects a request with no bearer token', async () => {
    const response = await request(app.getHttpServer())
      .post('/prescriptions')
      .send({
        consultationSessionId: session.getId(),
        diagnosisNodeId: node.getId(),
        lineItems: [
          { drugCatalogId: '44444444-4444-4444-8444-444444444444', dosage: '5mg', frequency: 'once daily', durationDays: 30 },
        ],
      })
      .expect(401);

    assert.equal(response.body.error.code, 'UNAUTHORIZED');
  });

  it('POST /prescriptions signs a prescription', async () => {
    const response = await request(app.getHttpServer())
      .post('/prescriptions')
      .set('Authorization', `Bearer ${DOCTOR_TOKEN}`)
      .send({
        consultationSessionId: session.getId(),
        diagnosisNodeId: node.getId(),
        lineItems: [
          {
            drugCatalogId: '44444444-4444-4444-8444-444444444444',
            drugName: 'Amlodipine 5mg',
            dosage: '5mg',
            frequency: 'once daily',
            durationDays: 30,
            instructions: 'Take in the morning',
          },
        ],
      })
      .expect(201);

    assert.equal(response.body.data.status, 'signed');
    assert.equal(response.body.data.lineItems.length, 1);
    signedPrescriptionId = response.body.data.id;
  });

  it('POST /prescriptions rejects a doctor who is not the treating doctor with 403', async () => {
    const response = await request(app.getHttpServer())
      .post('/prescriptions')
      .set('Authorization', `Bearer ${OTHER_DOCTOR_TOKEN}`)
      .send({
        consultationSessionId: session.getId(),
        diagnosisNodeId: node.getId(),
        lineItems: [
          { drugCatalogId: '44444444-4444-4444-8444-444444444444', dosage: '5mg', frequency: 'once daily', durationDays: 30 },
        ],
      })
      .expect(403);

    assert.equal(response.body.error.code, 'FORBIDDEN');
  });

  it('POST /prescriptions rejects an empty lineItems array with 400', async () => {
    const response = await request(app.getHttpServer())
      .post('/prescriptions')
      .set('Authorization', `Bearer ${DOCTOR_TOKEN}`)
      .send({
        consultationSessionId: session.getId(),
        diagnosisNodeId: node.getId(),
        lineItems: [],
      })
      .expect(400);

    assert.equal(response.body.error.code, 'VALIDATION_FAILED');
  });

  it('POST /prescriptions returns 404 for an unknown diagnosisNodeId', async () => {
    const response = await request(app.getHttpServer())
      .post('/prescriptions')
      .set('Authorization', `Bearer ${DOCTOR_TOKEN}`)
      .send({
        consultationSessionId: session.getId(),
        diagnosisNodeId: '99999999-9999-4999-8999-999999999999',
        lineItems: [
          { drugCatalogId: '44444444-4444-4444-8444-444444444444', dosage: '5mg', frequency: 'once daily', durationDays: 30 },
        ],
      })
      .expect(404);

    assert.equal(response.body.error.code, 'NOT_FOUND');
  });

  it('GET /prescriptions/:id rejects a request with no bearer token', async () => {
    const response = await request(app.getHttpServer()).get(`/prescriptions/${signedPrescriptionId}`).expect(401);
    assert.equal(response.body.error.code, 'UNAUTHORIZED');
  });

  it('GET /prescriptions/:id rejects a doctor who did not author it', async () => {
    const response = await request(app.getHttpServer())
      .get(`/prescriptions/${signedPrescriptionId}`)
      .set('Authorization', `Bearer ${OTHER_DOCTOR_TOKEN}`)
      .expect(404);
    assert.equal(response.body.error.code, 'NOT_FOUND');
  });

  it('GET /prescriptions/:id rejects a patient who was not treated', async () => {
    const response = await request(app.getHttpServer())
      .get(`/prescriptions/${signedPrescriptionId}`)
      .set('Authorization', `Bearer ${OTHER_PATIENT_TOKEN}`)
      .expect(404);
    assert.equal(response.body.error.code, 'NOT_FOUND');
  });

  it('GET /prescriptions/:id returns the signed prescription for the authoring doctor', async () => {
    const response = await request(app.getHttpServer())
      .get(`/prescriptions/${signedPrescriptionId}`)
      .set('Authorization', `Bearer ${DOCTOR_TOKEN}`)
      .expect(200);

    assert.equal(response.body.data.id, signedPrescriptionId);
  });

  it('GET /prescriptions/:id returns the signed prescription for the treated patient', async () => {
    const response = await request(app.getHttpServer())
      .get(`/prescriptions/${signedPrescriptionId}`)
      .set('Authorization', `Bearer ${PATIENT_TOKEN}`)
      .expect(200);

    assert.equal(response.body.data.id, signedPrescriptionId);
  });

  it('GET /prescriptions/:id returns 404 for an unknown id', async () => {
    const response = await request(app.getHttpServer())
      .get('/prescriptions/99999999-9999-4999-8999-999999999999')
      .set('Authorization', `Bearer ${DOCTOR_TOKEN}`)
      .expect(404);

    assert.equal(response.body.error.code, 'NOT_FOUND');
  });
});
