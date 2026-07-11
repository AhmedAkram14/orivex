import { ForbiddenError, NotFoundError } from '../../../../../shared/errors/app-error.js';
import type { DomainEventDispatcher } from '../../../../../shared/domain/domain-event-dispatcher.js';
import { GetAppointmentByIdUseCase } from '../../../../consultation/application/use-cases/get-appointment-by-id/get-appointment-by-id.use-case.js';
import { GetConsultationSessionByIdUseCase } from '../../../../consultation/application/use-cases/get-consultation-session-by-id/get-consultation-session-by-id.use-case.js';
import { ConsultationState } from '../../../../consultation/domain/enums/consultation-state.enum.js';
import { GetHealthGraphSubgraphUseCase } from '../../../../clinical/application/use-cases/get-health-graph-subgraph/get-health-graph-subgraph.use-case.js';
import { AISuggestion } from '../../../domain/entities/ai-suggestion.entity.js';
import type { AISuggestionRepository } from '../../../domain/repositories/ai-suggestion.repository.js';
import type { AIProviderPort } from '../../ports/ai-provider.port.js';

import type { RequestAISuggestionCommand } from './request-ai-suggestion.command.js';
import type { RequestAISuggestionResult } from './request-ai-suggestion.result.js';

// Plain TypeScript class — no NestJS dependency; DI wiring lives in
// ai.module.ts only. Matches docs/12-openapi.md's requestAISuggestion
// exactly: resolves the ConsultationSession -> Appointment (via
// ConsultationModule's own exported use cases -- module-to-module calls
// only through a published interface) to enforce "treating doctor, active
// consultation only", then builds server-determined context via
// ClinicalModule's own read-only GetHealthGraphSubgraphUseCase
// (docs/10-backend-architecture.md: "read-only scoped Graph query").
// AIModule never writes to ClinicalModule -- this only ever reads.
export class RequestAISuggestionUseCase {
  constructor(
    private readonly suggestionRepository: AISuggestionRepository,
    private readonly eventDispatcher: DomainEventDispatcher,
    private readonly getConsultationSessionByIdUseCase: GetConsultationSessionByIdUseCase,
    private readonly getAppointmentByIdUseCase: GetAppointmentByIdUseCase,
    private readonly getHealthGraphSubgraphUseCase: GetHealthGraphSubgraphUseCase,
    private readonly aiProvider: AIProviderPort,
  ) {}

  async execute(command: RequestAISuggestionCommand): Promise<RequestAISuggestionResult> {
    const session = await this.getConsultationSessionByIdUseCase.execute({
      consultationSessionId: command.consultationSessionId,
    });
    if (!session) {
      throw new NotFoundError(`ConsultationSession "${command.consultationSessionId}" not found.`);
    }

    const appointment = await this.getAppointmentByIdUseCase.execute({ appointmentId: session.getAppointmentId() });
    if (!appointment) {
      throw new NotFoundError(`Appointment "${session.getAppointmentId()}" not found.`);
    }

    if (appointment.getDoctorId() !== command.requestingDoctorId) {
      throw new ForbiddenError('Only the treating doctor for this consultation may request an AI suggestion.');
    }
    if (session.getState() !== ConsultationState.InProgress) {
      throw new ForbiddenError('AI suggestions may only be requested for an active consultation.');
    }

    const nodes = await this.getHealthGraphSubgraphUseCase.execute({ patientId: appointment.getPatientId() });

    try {
      const generated = await this.aiProvider.generateSuggestion({
        suggestionType: command.suggestionType,
        consultationSessionId: command.consultationSessionId,
        context: { patientId: appointment.getPatientId(), healthGraphNodes: nodes },
      });

      const suggestion = AISuggestion.generate({
        consultationSessionId: command.consultationSessionId,
        suggestionType: command.suggestionType,
        content: generated.content,
        confidenceScore: generated.confidenceScore,
        safetyFlags: generated.safetyFlags,
        requiresAcknowledgment: generated.requiresAcknowledgment,
      });

      await this.suggestionRepository.save(suggestion);
      await this.eventDispatcher.dispatch(suggestion.releaseDomainEvents());

      return { kind: 'generated', suggestion };
    } catch (error) {
      // docs/12-openapi.md: AI-unavailable is represented as a 202 degraded
      // mode, not an HTTP error status. No provider is configured yet
      // (ai.module.ts's NotConfiguredAIProviderAdapter), so this is the
      // expected path today; a real provider failure would land here too,
      // deliberately, per that same documented deviation from convention.
      const message = error instanceof Error ? error.message : 'AI suggestion generation is currently unavailable.';
      return { kind: 'unavailable', warnings: [message] };
    }
  }
}
