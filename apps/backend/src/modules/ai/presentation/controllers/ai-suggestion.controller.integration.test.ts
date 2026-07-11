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
import { GetHealthGraphSubgraphUseCase } from '../../../clinical/application/use-cases/get-health-graph-subgraph/get-health-graph-subgraph.use-case.js';
import { HealthGraph } from '../../../clinical/domain/entities/health-graph.entity.js';
import type { HealthGraphRepository } from '../../../clinical/domain/repositories/health-graph.repository.js';
import { GetPatientProfileByIdUseCase } from '../../../patient/application/use-cases/get-patient-profile-by-id/get-patient-profile-by-id.use-case.js';
import { PatientProfile } from '../../../patient/domain/entities/patient-profile.entity.js';
import type { PatientProfileRepository } from '../../../patient/domain/repositories/patient-profile.repository.js';
import { RecordDoctorDecisionUseCase } from '../../application/use-cases/record-doctor-decision/record-doctor-decision.use-case.js';
import { RequestAISuggestionUseCase } from '../../application/use-cases/request-ai-suggestion/request-ai-suggestion.use-case.js';
import type { AISuggestion } from '../../domain/entities/ai-suggestion.entity.js';
import type { AISuggestionRepository } from '../../domain/repositories/ai-suggestion.repository.js';
import type { AIProviderPort, GenerateSuggestionRequest, GenerateSuggestionResult } from '../../application/ports/ai-provider.port.js';

import { AISuggestionController } from './ai-suggestion.controller.js';

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

class InMemoryAISuggestionRepository implements AISuggestionRepository {
  private readonly byId = new Map<string, AISuggestion>();
  async findById(id: string): Promise<AISuggestion | null> {
    return this.byId.get(id) ?? null;
  }
  async save(suggestion: AISuggestion): Promise<void> {
    this.byId.set(suggestion.getId(), suggestion);
  }
}

class NoopDomainEventDispatcher {
  async dispatch(): Promise<void> {
    // intentionally empty
  }
  subscribe(): void {}
}

class SucceedingAIProvider implements AIProviderPort {
  async generateSuggestion(_request: GenerateSuggestionRequest): Promise<GenerateSuggestionResult> {
    return { content: 'Suggested SOAP draft.', confidenceScore: 0.9, safetyFlags: [], requiresAcknowledgment: true };
  }
}

class FailingAIProvider implements AIProviderPort {
  async generateSuggestion(): Promise<GenerateSuggestionResult> {
    throw new Error('AIProviderPort has no configured provider.');
  }
}

describe('AISuggestionController (integration)', () => {
  let app: INestApplication;
  let doctor: { id: string };
  let otherDoctorId: string;
  let session: ConsultationSession;
  let generatedSuggestionId: string;

  before(async () => {
    const patient = PatientProfile.create({ accountId: '11111111-1111-4111-8111-111111111111' });
    doctor = { id: '22222222-2222-4222-8222-222222222222' };
    otherDoctorId = '55555555-5555-4555-8555-555555555555';
    const appointment = Appointment.request({
      patientId: patient.getId(),
      doctorId: doctor.id,
      availabilityWindowId: '33333333-3333-4333-8333-333333333333',
      consultationType: ConsultationType.Free,
      scheduledAt: new Date(Date.now() + 60 * 60_000),
    });
    session = ConsultationSession.open(appointment.getId());
    session.start();
    const graph = HealthGraph.create(patient.getId());

    const suggestionRepo = new InMemoryAISuggestionRepository();
    const requestAISuggestionUseCase = new RequestAISuggestionUseCase(
      suggestionRepo,
      new NoopDomainEventDispatcher(),
      new GetConsultationSessionByIdUseCase(new InMemoryConsultationSessionRepository(session)),
      new GetAppointmentByIdUseCase(new InMemoryAppointmentRepository(appointment)),
      new GetHealthGraphSubgraphUseCase(
        new InMemoryHealthGraphRepository(graph),
        new GetPatientProfileByIdUseCase(new InMemoryPatientProfileRepository(patient)),
      ),
      new SucceedingAIProvider(),
    );
    const recordDoctorDecisionUseCase = new RecordDoctorDecisionUseCase(suggestionRepo, new NoopDomainEventDispatcher());

    const moduleRef = await Test.createTestingModule({
      controllers: [AISuggestionController],
      providers: [
        PinoLoggerService,
        { provide: DOMAIN_EVENT_DISPATCHER, useClass: NoopDomainEventDispatcher },
        { provide: RequestAISuggestionUseCase, useValue: requestAISuggestionUseCase },
        { provide: RecordDoctorDecisionUseCase, useValue: recordDoctorDecisionUseCase },
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

  it('POST /ai/suggestions generates a suggestion for the treating doctor with 200', async () => {
    const response = await request(app.getHttpServer())
      .post('/ai/suggestions')
      .send({ requestingDoctorId: doctor.id, consultationSessionId: session.getId(), suggestionType: 'soap_draft' })
      .expect(200);

    assert.equal(response.body.data.requiresAcknowledgment, true);
    assert.equal(response.body.data.doctorDecision, null);
    generatedSuggestionId = response.body.data.id;
  });

  it('POST /ai/suggestions rejects a doctor who is not the treating doctor with 403', async () => {
    const response = await request(app.getHttpServer())
      .post('/ai/suggestions')
      .send({ requestingDoctorId: otherDoctorId, consultationSessionId: session.getId(), suggestionType: 'soap_draft' })
      .expect(403);

    assert.equal(response.body.error.code, 'FORBIDDEN');
  });

  it('PATCH /ai/suggestions/:id records a decision with 200', async () => {
    const response = await request(app.getHttpServer())
      .patch(`/ai/suggestions/${generatedSuggestionId}`)
      .send({ decision: 'approved' })
      .expect(200);

    assert.equal(response.body.data.doctorDecision, 'approved');
  });

  it('PATCH /ai/suggestions/:id returns 409 for an already-decided suggestion', async () => {
    const response = await request(app.getHttpServer())
      .patch(`/ai/suggestions/${generatedSuggestionId}`)
      .send({ decision: 'edited' })
      .expect(409);

    assert.equal(response.body.error.code, 'CONFLICT');
  });

  it('PATCH /ai/suggestions/:id returns 422 when rejecting a Warning-tier suggestion without a justification', async () => {
    const freshPatient = PatientProfile.create({ accountId: '11111111-1111-4111-8111-111111111111' });
    const freshAppointment = Appointment.request({
      patientId: freshPatient.getId(),
      doctorId: doctor.id,
      availabilityWindowId: '33333333-3333-4333-8333-333333333333',
      consultationType: ConsultationType.Free,
      scheduledAt: new Date(Date.now() + 60 * 60_000),
    });
    const freshSession = ConsultationSession.open(freshAppointment.getId());
    freshSession.start();

    const secondRepo = new InMemoryAISuggestionRepository();
    const secondRequestUseCase = new RequestAISuggestionUseCase(
      secondRepo,
      new NoopDomainEventDispatcher(),
      new GetConsultationSessionByIdUseCase(new InMemoryConsultationSessionRepository(freshSession)),
      new GetAppointmentByIdUseCase(new InMemoryAppointmentRepository(freshAppointment)),
      new GetHealthGraphSubgraphUseCase(
        new InMemoryHealthGraphRepository(HealthGraph.create(freshPatient.getId())),
        new GetPatientProfileByIdUseCase(new InMemoryPatientProfileRepository(freshPatient)),
      ),
      new SucceedingAIProvider(),
    );
    const secondDecisionUseCase = new RecordDoctorDecisionUseCase(secondRepo, new NoopDomainEventDispatcher());

    const secondModuleRef = await Test.createTestingModule({
      controllers: [AISuggestionController],
      providers: [
        PinoLoggerService,
        { provide: DOMAIN_EVENT_DISPATCHER, useClass: NoopDomainEventDispatcher },
        { provide: RequestAISuggestionUseCase, useValue: secondRequestUseCase },
        { provide: RecordDoctorDecisionUseCase, useValue: secondDecisionUseCase },
      ],
    }).compile();
    const secondApp = secondModuleRef.createNestApplication();
    secondApp.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true, exceptionFactory: createValidationException }),
    );
    secondApp.useGlobalFilters(new AllExceptionsFilter(secondModuleRef.get(PinoLoggerService)));
    await secondApp.init();

    const generateResponse = await request(secondApp.getHttpServer())
      .post('/ai/suggestions')
      .send({ requestingDoctorId: doctor.id, consultationSessionId: freshSession.getId(), suggestionType: 'interaction_flag' })
      .expect(200);

    const response = await request(secondApp.getHttpServer())
      .patch(`/ai/suggestions/${generateResponse.body.data.id}`)
      .send({ decision: 'rejected' })
      .expect(422);

    assert.equal(response.body.error.code, 'VALIDATION_FAILED');
  });

  it('POST /ai/suggestions returns 202 unavailable when the AI provider is not configured', async () => {
    const freshPatient = PatientProfile.create({ accountId: '11111111-1111-4111-8111-111111111111' });
    const freshAppointment = Appointment.request({
      patientId: freshPatient.getId(),
      doctorId: doctor.id,
      availabilityWindowId: '33333333-3333-4333-8333-333333333333',
      consultationType: ConsultationType.Free,
      scheduledAt: new Date(Date.now() + 60 * 60_000),
    });
    const freshSession = ConsultationSession.open(freshAppointment.getId());
    freshSession.start();

    const unavailableRepo = new InMemoryAISuggestionRepository();
    const unavailableUseCase = new RequestAISuggestionUseCase(
      unavailableRepo,
      new NoopDomainEventDispatcher(),
      new GetConsultationSessionByIdUseCase(new InMemoryConsultationSessionRepository(freshSession)),
      new GetAppointmentByIdUseCase(new InMemoryAppointmentRepository(freshAppointment)),
      new GetHealthGraphSubgraphUseCase(
        new InMemoryHealthGraphRepository(HealthGraph.create(freshPatient.getId())),
        new GetPatientProfileByIdUseCase(new InMemoryPatientProfileRepository(freshPatient)),
      ),
      new FailingAIProvider(),
    );
    const moduleRef = await Test.createTestingModule({
      controllers: [AISuggestionController],
      providers: [
        PinoLoggerService,
        { provide: DOMAIN_EVENT_DISPATCHER, useClass: NoopDomainEventDispatcher },
        { provide: RequestAISuggestionUseCase, useValue: unavailableUseCase },
        { provide: RecordDoctorDecisionUseCase, useValue: new RecordDoctorDecisionUseCase(unavailableRepo, new NoopDomainEventDispatcher()) },
      ],
    }).compile();
    const unavailableApp = moduleRef.createNestApplication();
    unavailableApp.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true, exceptionFactory: createValidationException }),
    );
    unavailableApp.useGlobalFilters(new AllExceptionsFilter(moduleRef.get(PinoLoggerService)));
    await unavailableApp.init();

    const response = await request(unavailableApp.getHttpServer())
      .post('/ai/suggestions')
      .send({ requestingDoctorId: doctor.id, consultationSessionId: freshSession.getId(), suggestionType: 'soap_draft' })
      .expect(202);

    assert.equal(response.body.data.status, 'unavailable');
    assert.equal(response.body.data.warnings.length, 1);
  });
});
