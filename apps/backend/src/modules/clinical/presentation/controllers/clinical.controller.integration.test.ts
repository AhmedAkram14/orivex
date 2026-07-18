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
import { ListHealthJourneysUseCase } from '../../application/use-cases/list-health-journeys/list-health-journeys.use-case.js';
import { RecordClinicalNoteUseCase } from '../../application/use-cases/record-clinical-note/record-clinical-note.use-case.js';
import { HealthGraph } from '../../domain/entities/health-graph.entity.js';
import { HealthJourney } from '../../domain/entities/health-journey.entity.js';
import { HealthGraphNodeType } from '../../domain/enums/health-graph-node-type.enum.js';
import type { ClinicalNote } from '../../domain/entities/clinical-note.entity.js';
import type { ClinicalNoteRepository } from '../../domain/repositories/clinical-note.repository.js';
import type { HealthGraphRepository } from '../../domain/repositories/health-graph.repository.js';
import type { HealthJourneyRepository } from '../../domain/repositories/health-journey.repository.js';

import { ClinicalNoteController } from './clinical-note.controller.js';
import { HealthGraphController } from './health-graph.controller.js';

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
  async findByDoctorId(doctorId: string): Promise<Appointment[]> {
    return this.appointment.getDoctorId() === doctorId ? [this.appointment] : [];
  }
  async save(): Promise<void> {}
}

class InMemoryClinicalNoteRepository implements ClinicalNoteRepository {
  public readonly saved: ClinicalNote[] = [];
  async findById(): Promise<ClinicalNote | null> {
    return null;
  }
  async findByConsultationSessionId(): Promise<ClinicalNote[]> {
    return [];
  }
  async save(note: ClinicalNote): Promise<void> {
    this.saved.push(note);
  }
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

class InMemoryHealthJourneyRepository implements HealthJourneyRepository {
  constructor(private readonly journeys: HealthJourney[]) {}
  async findById(): Promise<HealthJourney | null> {
    return null;
  }
  async findByHealthGraphId(): Promise<HealthJourney[]> {
    return this.journeys;
  }
  async save(): Promise<void> {}
}

describe('Clinical controllers (integration)', () => {
  let app: INestApplication;
  let patient: PatientProfile;
  let otherPatient: PatientProfile;
  let doctor: DoctorProfile;
  let otherDoctor: DoctorProfile;
  let session: ConsultationSession;

  before(async () => {
    patient = PatientProfile.create({ accountId: '11111111-1111-4111-8111-111111111111' });
    otherPatient = PatientProfile.create({ accountId: '77777777-7777-4777-8777-777777777777' });
    doctor = DoctorProfile.register({
      accountId: '22222222-2222-4222-8222-222222222222',
      licenseNumber: 'LIC-1',
      specialty: 'Cardiology',
    });
    otherDoctor = DoctorProfile.register({
      accountId: '66666666-6666-4666-8666-666666666666',
      licenseNumber: 'LIC-2',
      specialty: 'Dermatology',
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
    const node = graph.addNode({ nodeType: HealthGraphNodeType.Condition, authoringDoctorId: doctor.getId() });
    const journey = HealthJourney.start(graph.getId(), node.getId());

    const doctorProfileRepo = new InMemoryDoctorProfileRepository([doctor, otherDoctor]);
    const patientProfileRepo = new InMemoryPatientProfileRepository(patient);

    const jwtSigner = new FakeJwtSigner(
      new Map([
        [DOCTOR_TOKEN, { accountId: doctor.getAccountId(), role: AccountRole.Doctor }],
        [OTHER_DOCTOR_TOKEN, { accountId: otherDoctor.getAccountId(), role: AccountRole.Doctor }],
        [PATIENT_TOKEN, { accountId: patient.getAccountId(), role: AccountRole.Patient }],
        [OTHER_PATIENT_TOKEN, { accountId: otherPatient.getAccountId(), role: AccountRole.Patient }],
      ]),
    );

    const moduleRef = await Test.createTestingModule({
      controllers: [ClinicalNoteController, HealthGraphController],
      providers: [
        PinoLoggerService,
        Reflector,
        JwtAuthGuard,
        RolesGuard,
        { provide: JWT_SIGNER, useFactory: () => jwtSigner },
        { provide: GetDoctorProfileByAccountIdUseCase, useFactory: () => new GetDoctorProfileByAccountIdUseCase(doctorProfileRepo) },
        { provide: GetPatientProfileByAccountIdUseCase, useFactory: () => new GetPatientProfileByAccountIdUseCase(patientProfileRepo) },
        {
          provide: RecordClinicalNoteUseCase,
          useFactory: () =>
            new RecordClinicalNoteUseCase(
              new InMemoryClinicalNoteRepository(),
              new GetConsultationSessionByIdUseCase(new InMemoryConsultationSessionRepository(session)),
              new GetAppointmentByIdUseCase(new InMemoryAppointmentRepository(appointment)),
              new GetDoctorProfileByIdUseCase(doctorProfileRepo),
            ),
        },
        {
          provide: GetHealthGraphSubgraphUseCase,
          useFactory: () =>
            new GetHealthGraphSubgraphUseCase(
              new InMemoryHealthGraphRepository(graph),
              new GetPatientProfileByIdUseCase(patientProfileRepo),
            ),
        },
        {
          provide: ListHealthJourneysUseCase,
          useFactory: () =>
            new ListHealthJourneysUseCase(
              new InMemoryHealthGraphRepository(graph),
              new InMemoryHealthJourneyRepository([journey]),
              new GetPatientProfileByIdUseCase(patientProfileRepo),
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

  it('POST /consultations/:id/notes rejects a request with no bearer token', async () => {
    const response = await request(app.getHttpServer())
      .post(`/consultations/${session.getId()}/notes`)
      .send({ content: 'SOAP note content' })
      .expect(401);

    assert.equal(response.body.error.code, 'UNAUTHORIZED');
  });

  it('POST /consultations/:id/notes records a note', async () => {
    const response = await request(app.getHttpServer())
      .post(`/consultations/${session.getId()}/notes`)
      .set('Authorization', `Bearer ${DOCTOR_TOKEN}`)
      .send({ content: 'SOAP note content' })
      .expect(201);

    assert.equal(response.body.data.content, 'SOAP note content');
  });

  it('POST /consultations/:id/notes returns 404 for an unknown session', async () => {
    const response = await request(app.getHttpServer())
      .post('/consultations/99999999-9999-4999-8999-999999999999/notes')
      .set('Authorization', `Bearer ${DOCTOR_TOKEN}`)
      .send({ content: 'SOAP note content' })
      .expect(404);

    assert.equal(response.body.error.code, 'NOT_FOUND');
  });

  it('POST /consultations/:id/notes rejects a doctor who is not the treating doctor with 403', async () => {
    const response = await request(app.getHttpServer())
      .post(`/consultations/${session.getId()}/notes`)
      .set('Authorization', `Bearer ${OTHER_DOCTOR_TOKEN}`)
      .send({ content: 'SOAP note content' })
      .expect(403);

    assert.equal(response.body.error.code, 'FORBIDDEN');
  });

  it('GET /patients/:id/health-graph rejects a request with no bearer token', async () => {
    const response = await request(app.getHttpServer()).get(`/patients/${patient.getId()}/health-graph`).expect(401);
    assert.equal(response.body.error.code, 'UNAUTHORIZED');
  });

  it('GET /patients/:id/health-graph rejects a different patient reading someone else\'s graph', async () => {
    const response = await request(app.getHttpServer())
      .get(`/patients/${patient.getId()}/health-graph`)
      .set('Authorization', `Bearer ${OTHER_PATIENT_TOKEN}`)
      .expect(404);
    assert.equal(response.body.error.code, 'NOT_FOUND');
  });

  it('GET /patients/:id/health-graph returns the patient\'s nodes for the owning patient', async () => {
    const response = await request(app.getHttpServer())
      .get(`/patients/${patient.getId()}/health-graph`)
      .set('Authorization', `Bearer ${PATIENT_TOKEN}`)
      .expect(200);

    assert.equal(response.body.data.length, 1);
    assert.equal(response.body.data[0].nodeType, 'condition');
  });

  it('GET /patients/:id/health-graph returns the patient\'s nodes for any doctor', async () => {
    const response = await request(app.getHttpServer())
      .get(`/patients/${patient.getId()}/health-graph`)
      .set('Authorization', `Bearer ${DOCTOR_TOKEN}`)
      .expect(200);

    assert.equal(response.body.data.length, 1);
  });

  it('GET /patients/:id/journeys returns the patient\'s journeys with rootNode resolved', async () => {
    const response = await request(app.getHttpServer())
      .get(`/patients/${patient.getId()}/journeys`)
      .set('Authorization', `Bearer ${PATIENT_TOKEN}`)
      .expect(200);

    assert.equal(response.body.data.length, 1);
    assert.equal(response.body.data[0].stage, 'diagnosis');
    assert.ok(response.body.data[0].rootNode);
  });
});
