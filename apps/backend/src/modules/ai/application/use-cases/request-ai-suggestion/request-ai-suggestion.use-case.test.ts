import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { ForbiddenError, NotFoundError } from '../../../../../shared/errors/app-error.js';
import { GetAppointmentByIdUseCase } from '../../../../consultation/application/use-cases/get-appointment-by-id/get-appointment-by-id.use-case.js';
import { GetConsultationSessionByIdUseCase } from '../../../../consultation/application/use-cases/get-consultation-session-by-id/get-consultation-session-by-id.use-case.js';
import { Appointment } from '../../../../consultation/domain/entities/appointment.entity.js';
import { ConsultationSession } from '../../../../consultation/domain/entities/consultation-session.entity.js';
import { ConsultationPricing } from '../../../../consultation/domain/value-objects/consultation-pricing.value-object.js';
import type { AppointmentRepository } from '../../../../consultation/domain/repositories/appointment.repository.js';
import type { ConsultationSessionRepository } from '../../../../consultation/domain/repositories/consultation-session.repository.js';
import { GetHealthGraphSubgraphUseCase } from '../../../../clinical/application/use-cases/get-health-graph-subgraph/get-health-graph-subgraph.use-case.js';
import { HealthGraph } from '../../../../clinical/domain/entities/health-graph.entity.js';
import type { HealthGraphRepository } from '../../../../clinical/domain/repositories/health-graph.repository.js';
import { GetPatientProfileByIdUseCase } from '../../../../patient/application/use-cases/get-patient-profile-by-id/get-patient-profile-by-id.use-case.js';
import type { PatientProfile } from '../../../../patient/domain/entities/patient-profile.entity.js';
import type { PatientProfileRepository } from '../../../../patient/domain/repositories/patient-profile.repository.js';
import type { GenerateSuggestionRequest, GenerateSuggestionResult, AIProviderPort } from '../../ports/ai-provider.port.js';
import { AISuggestionType } from '../../../domain/enums/ai-suggestion-type.enum.js';
import type { AISuggestion } from '../../../domain/entities/ai-suggestion.entity.js';
import type { AISuggestionRepository } from '../../../domain/repositories/ai-suggestion.repository.js';

import { RequestAISuggestionCommand } from './request-ai-suggestion.command.js';
import { RequestAISuggestionUseCase } from './request-ai-suggestion.use-case.js';

class FakeConsultationSessionRepository implements ConsultationSessionRepository {
  constructor(private readonly session: ConsultationSession | null) {}
  async findById(): Promise<ConsultationSession | null> {
    return this.session;
  }
  async findByAppointmentId(): Promise<ConsultationSession | null> {
    return null;
  }
  async findStale(): Promise<ConsultationSession[]> {
    return [];
  }
  async save(): Promise<void> {}
}

class FakeAppointmentRepository implements AppointmentRepository {
  constructor(private readonly appointment: Appointment | null) {}
  async findById(): Promise<Appointment | null> {
    return this.appointment;
  }
  async findByPatientId(patientId: string): Promise<Appointment[]> {
    return this.appointment && this.appointment.getPatientId() === patientId ? [this.appointment] : [];
  }
  async findByPatientIdPage(patientId: string, skip: number, take: number): Promise<Appointment[]> {
    return (await this.findByPatientId(patientId)).slice(skip, skip + take);
  }
  async countByPatientId(patientId: string): Promise<number> {
    return (await this.findByPatientId(patientId)).length;
  }
  async findByDoctorId(doctorId: string): Promise<Appointment[]> {
    return this.appointment && this.appointment.getDoctorId() === doctorId ? [this.appointment] : [];
  }
  async findByDoctorIdForDateRange(doctorId: string): Promise<Appointment[]> {
    return this.findByDoctorId(doctorId);
  }
  async countByDoctorIds(): Promise<Map<string, number>> {
    return new Map();
  }
  async countByStatusForDoctor(): Promise<Partial<Record<string, number>>> {
    return {};
  }
  async save(): Promise<void> {}
}

class FakeHealthGraphRepository implements HealthGraphRepository {
  constructor(private readonly graph: HealthGraph | null) {}
  async findById(): Promise<HealthGraph | null> {
    return this.graph;
  }
  async findByPatientId(): Promise<HealthGraph | null> {
    return this.graph;
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

class FakeAISuggestionRepository implements AISuggestionRepository {
  public readonly saved: AISuggestion[] = [];
  async findById(): Promise<AISuggestion | null> {
    return null;
  }
  async save(suggestion: AISuggestion): Promise<void> {
    this.saved.push(suggestion);
  }
}

class NoopDispatcher {
  public readonly dispatched: unknown[][] = [];
  async dispatch(events: unknown[]): Promise<void> {
    this.dispatched.push(events);
  }
  subscribe(): void {}
}

class SucceedingAIProvider implements AIProviderPort {
  async generateSuggestion(_request: GenerateSuggestionRequest): Promise<GenerateSuggestionResult> {
    return { content: 'Suggested SOAP draft.', confidenceScore: 0.9, safetyFlags: [], requiresAcknowledgment: false };
  }
}

class FailingAIProvider implements AIProviderPort {
  async generateSuggestion(): Promise<GenerateSuggestionResult> {
    throw new Error('AIProviderPort has no configured provider.');
  }
}

function buildScenario() {
  const appointment = Appointment.request({
    patientId: '11111111-1111-4111-8111-111111111111',
    doctorId: '22222222-2222-4222-8222-222222222222',
    availabilityWindowId: '33333333-3333-4333-8333-333333333333',
    pricing: ConsultationPricing.free(),
    scheduledAt: new Date(Date.now() + 60 * 60_000),
  });
  const session = ConsultationSession.open(appointment.getId());
  session.start();
  const graph = HealthGraph.create(appointment.getPatientId());
  return { appointment, session, graph };
}

function buildUseCase(props: {
  appointment: Appointment | null;
  session: ConsultationSession | null;
  graph: HealthGraph | null;
  suggestionRepo: AISuggestionRepository;
  dispatcher?: NoopDispatcher;
  aiProvider: AIProviderPort;
}): RequestAISuggestionUseCase {
  return new RequestAISuggestionUseCase(
    props.suggestionRepo,
    props.dispatcher ?? new NoopDispatcher(),
    new GetConsultationSessionByIdUseCase(new FakeConsultationSessionRepository(props.session)),
    new GetAppointmentByIdUseCase(new FakeAppointmentRepository(props.appointment)),
    new GetHealthGraphSubgraphUseCase(
      new FakeHealthGraphRepository(props.graph),
      new GetPatientProfileByIdUseCase(new FakePatientProfileRepository({} as PatientProfile)),
    ),
    props.aiProvider,
  );
}

describe('RequestAISuggestionUseCase', () => {
  it('generates a suggestion for the treating doctor on an active consultation', async () => {
    const { appointment, session, graph } = buildScenario();
    const suggestionRepo = new FakeAISuggestionRepository();
    const useCase = buildUseCase({
      appointment,
      session,
      graph,
      suggestionRepo,
      aiProvider: new SucceedingAIProvider(),
    });

    const result = await useCase.execute(
      new RequestAISuggestionCommand({
        consultationSessionId: session.getId(),
        suggestionType: AISuggestionType.SoapDraft,
        requestingDoctorId: appointment.getDoctorId(),
      }),
    );

    assert.equal(result.kind, 'generated');
    assert.equal(suggestionRepo.saved.length, 1);
  });

  it('throws NotFoundError when the consultation session does not exist', async () => {
    const { appointment, graph } = buildScenario();
    const useCase = buildUseCase({
      appointment,
      session: null,
      graph,
      suggestionRepo: new FakeAISuggestionRepository(),
      aiProvider: new SucceedingAIProvider(),
    });

    await assert.rejects(
      () =>
        useCase.execute(
          new RequestAISuggestionCommand({
            consultationSessionId: 'missing-id',
            suggestionType: AISuggestionType.SoapDraft,
            requestingDoctorId: appointment.getDoctorId(),
          }),
        ),
      NotFoundError,
    );
  });

  it('throws ForbiddenError when requestingDoctorId is not the appointment\'s treating doctor', async () => {
    const { appointment, session, graph } = buildScenario();
    const useCase = buildUseCase({
      appointment,
      session,
      graph,
      suggestionRepo: new FakeAISuggestionRepository(),
      aiProvider: new SucceedingAIProvider(),
    });

    await assert.rejects(
      () =>
        useCase.execute(
          new RequestAISuggestionCommand({
            consultationSessionId: session.getId(),
            suggestionType: AISuggestionType.SoapDraft,
            requestingDoctorId: '55555555-5555-4555-8555-555555555555',
          }),
        ),
      ForbiddenError,
    );
  });

  it('throws ForbiddenError when the consultation is not active', async () => {
    const appointment = Appointment.request({
      patientId: '11111111-1111-4111-8111-111111111111',
      doctorId: '22222222-2222-4222-8222-222222222222',
      availabilityWindowId: '33333333-3333-4333-8333-333333333333',
      pricing: ConsultationPricing.free(),
      scheduledAt: new Date(Date.now() + 60 * 60_000),
    });
    const session = ConsultationSession.open(appointment.getId());
    const graph = HealthGraph.create(appointment.getPatientId());
    const useCase = buildUseCase({
      appointment,
      session,
      graph,
      suggestionRepo: new FakeAISuggestionRepository(),
      aiProvider: new SucceedingAIProvider(),
    });

    await assert.rejects(
      () =>
        useCase.execute(
          new RequestAISuggestionCommand({
            consultationSessionId: session.getId(),
            suggestionType: AISuggestionType.SoapDraft,
            requestingDoctorId: appointment.getDoctorId(),
          }),
        ),
      ForbiddenError,
    );
  });

  it('returns an unavailable result instead of throwing when the AI provider fails', async () => {
    const { appointment, session, graph } = buildScenario();
    const suggestionRepo = new FakeAISuggestionRepository();
    const useCase = buildUseCase({
      appointment,
      session,
      graph,
      suggestionRepo,
      aiProvider: new FailingAIProvider(),
    });

    const result = await useCase.execute(
      new RequestAISuggestionCommand({
        consultationSessionId: session.getId(),
        suggestionType: AISuggestionType.SoapDraft,
        requestingDoctorId: appointment.getDoctorId(),
      }),
    );

    assert.equal(result.kind, 'unavailable');
    assert.equal(suggestionRepo.saved.length, 0);
    if (result.kind === 'unavailable') {
      assert.equal(result.warnings.length, 1);
    }
  });
});
