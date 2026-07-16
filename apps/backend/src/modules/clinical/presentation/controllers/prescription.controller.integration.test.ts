import assert from 'node:assert/strict';
import { before, describe, it } from 'node:test';

import { ValidationPipe, type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';

import { AllExceptionsFilter } from '../../../../platform/filters/all-exceptions.filter.js';
import { PinoLoggerService } from '../../../../platform/logging/pino-logger.service.js';
import { createValidationException } from '../../../../platform/validation/validation-exception-factory.js';
import { DOMAIN_EVENT_DISPATCHER } from '../../../../shared/domain/tokens.js';
import { GetAppointmentByIdUseCase } from '../../../consultation/application/use-cases/get-appointment-by-id/get-appointment-by-id.use-case.js';
import { GetConsultationSessionByIdUseCase } from '../../../consultation/application/use-cases/get-consultation-session-by-id/get-consultation-session-by-id.use-case.js';
import { Appointment } from '../../../consultation/domain/entities/appointment.entity.js';
import { ConsultationSession } from '../../../consultation/domain/entities/consultation-session.entity.js';
import { ConsultationType } from '../../../consultation/domain/enums/consultation-type.enum.js';
import type { AppointmentRepository } from '../../../consultation/domain/repositories/appointment.repository.js';
import type { ConsultationSessionRepository } from '../../../consultation/domain/repositories/consultation-session.repository.js';
import { GetDoctorProfileByIdUseCase } from '../../../doctor/application/use-cases/get-doctor-profile-by-id/get-doctor-profile-by-id.use-case.js';
import { DoctorProfile } from '../../../doctor/domain/entities/doctor-profile.entity.js';
import type { DoctorProfileRepository } from '../../../doctor/domain/repositories/doctor-profile.repository.js';
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

class InMemoryPatientProfileRepository implements PatientProfileRepository {
  constructor(private readonly profile: PatientProfile) {}
  async findById(id: string): Promise<PatientProfile | null> {
    return this.profile.getId() === id ? this.profile : null;
  }
  async findByAccountId(): Promise<PatientProfile | null> {
    return null;
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
    doctor = DoctorProfile.register({
      accountId: '22222222-2222-4222-8222-222222222222',
      licenseNumber: 'LIC-1',
      specialty: 'Cardiology',
    });
    otherDoctor = DoctorProfile.register({
      accountId: '55555555-5555-4555-8555-555555555555',
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
    node = graph.addNode({ nodeType: HealthGraphNodeType.Condition, authoringDoctorId: doctor.getId() });

    const prescriptionRepo = new InMemoryPrescriptionRepository();
    const signPrescriptionUseCase = new SignPrescriptionUseCase(
      prescriptionRepo,
      new NoopDomainEventDispatcher(),
      new GetConsultationSessionByIdUseCase(new InMemoryConsultationSessionRepository(session)),
      new GetAppointmentByIdUseCase(new InMemoryAppointmentRepository(appointment)),
      new GetDoctorProfileByIdUseCase(new InMemoryDoctorProfileRepository([doctor, otherDoctor])),
      new GetHealthGraphSubgraphUseCase(
        new InMemoryHealthGraphRepository(graph),
        new GetPatientProfileByIdUseCase(new InMemoryPatientProfileRepository(patient)),
      ),
      new InMemoryPendingAISuggestionAcknowledgmentRepository(),
    );
    const getPrescriptionByIdUseCase = new GetPrescriptionByIdUseCase(prescriptionRepo);

    const moduleRef = await Test.createTestingModule({
      controllers: [PrescriptionController],
      providers: [
        PinoLoggerService,
        { provide: DOMAIN_EVENT_DISPATCHER, useClass: NoopDomainEventDispatcher },
        { provide: SignPrescriptionUseCase, useValue: signPrescriptionUseCase },
        { provide: GetPrescriptionByIdUseCase, useValue: getPrescriptionByIdUseCase },
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

  it('POST /prescriptions signs a prescription', async () => {
    const response = await request(app.getHttpServer())
      .post('/prescriptions')
      .send({
        authoringDoctorId: doctor.getId(),
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
      .send({
        authoringDoctorId: otherDoctor.getId(),
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
      .send({
        authoringDoctorId: doctor.getId(),
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
      .send({
        authoringDoctorId: doctor.getId(),
        consultationSessionId: session.getId(),
        diagnosisNodeId: '99999999-9999-4999-8999-999999999999',
        lineItems: [
          { drugCatalogId: '44444444-4444-4444-8444-444444444444', dosage: '5mg', frequency: 'once daily', durationDays: 30 },
        ],
      })
      .expect(404);

    assert.equal(response.body.error.code, 'NOT_FOUND');
  });

  it('GET /prescriptions/:id returns the signed prescription', async () => {
    const response = await request(app.getHttpServer()).get(`/prescriptions/${signedPrescriptionId}`).expect(200);

    assert.equal(response.body.data.id, signedPrescriptionId);
  });

  it('GET /prescriptions/:id returns 404 for an unknown id', async () => {
    const response = await request(app.getHttpServer())
      .get('/prescriptions/99999999-9999-4999-8999-999999999999')
      .expect(404);

    assert.equal(response.body.error.code, 'NOT_FOUND');
  });
});
