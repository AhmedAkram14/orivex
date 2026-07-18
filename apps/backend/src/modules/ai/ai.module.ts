import { Module } from '@nestjs/common';

import type { DomainEventDispatcher } from '../../shared/domain/domain-event-dispatcher.js';
import { DOMAIN_EVENT_DISPATCHER } from '../../shared/domain/tokens.js';
import { AuthenticationGuardsModule } from '../authentication/authentication-guards.module.js';
import { ClinicalModule } from '../clinical/clinical.module.js';
import { GetHealthGraphSubgraphUseCase } from '../clinical/application/use-cases/get-health-graph-subgraph/get-health-graph-subgraph.use-case.js';
import { ConsultationModule } from '../consultation/consultation.module.js';
import { GetAppointmentByIdUseCase } from '../consultation/application/use-cases/get-appointment-by-id/get-appointment-by-id.use-case.js';
import { GetConsultationSessionByIdUseCase } from '../consultation/application/use-cases/get-consultation-session-by-id/get-consultation-session-by-id.use-case.js';
import { DoctorModule } from '../doctor/doctor.module.js';

import type { AIProviderPort } from './application/ports/ai-provider.port.js';
import { AI_PROVIDER, AI_SUGGESTION_REPOSITORY } from './application/ports/tokens.js';
import { GetAISuggestionByIdUseCase } from './application/use-cases/get-ai-suggestion-by-id/get-ai-suggestion-by-id.use-case.js';
import { RecordDoctorDecisionUseCase } from './application/use-cases/record-doctor-decision/record-doctor-decision.use-case.js';
import { RequestAISuggestionUseCase } from './application/use-cases/request-ai-suggestion/request-ai-suggestion.use-case.js';
import type { AISuggestionRepository } from './domain/repositories/ai-suggestion.repository.js';
import { NotConfiguredAIProviderAdapter } from './infrastructure/gateway/not-configured-ai-provider.adapter.js';
import { PrismaAISuggestionRepository } from './infrastructure/prisma/prisma-ai-suggestion.repository.js';
import { AISuggestionController } from './presentation/controllers/ai-suggestion.controller.js';

// Imports ClinicalModule (read-only Graph query) and ConsultationModule
// (live consultation/appointment context) to consume their own exported use
// cases (module-to-module calls only through a published interface, never
// another module's repository -- docs/10-backend-architecture.md Section
// 11). Neither module imports AIModule back -- no circular imports, no
// forwardRef(); this is the one-way dependency docs/10-backend-
// architecture.md mandates ("AIModule calls into Clinical's read
// interface, not the reverse").
//
// AI_PROVIDER is bound to NotConfiguredAIProviderAdapter -- no AI provider
// has been selected/configured yet, but the module stays fully registered
// (architect direction: "do not leave finished modules disconnected from
// AppModule"). Dependency inversion stays intact; the missing dependency is
// explicit; the app boots cleanly; only an actual requestAISuggestion call
// falls back to the documented AI-unavailable 202 degraded mode. Swap this
// binding for a real adapter the moment a provider is chosen -- nothing
// else changes.
//
// No async job-queue infrastructure is introduced this sprint -- generation
// is always synchronous against AIProviderPort, so the 'queued' response
// case from docs/12-openapi.md is deliberately not produced (only
// 'generated' and 'unavailable' are). GetSuggestionHistory (docs/10-
// backend-architecture.md's AIModule query) is also not exposed -- no
// endpoint for it is documented in docs/12-openapi.md.
@Module({
  imports: [ClinicalModule, ConsultationModule, DoctorModule, AuthenticationGuardsModule],
  controllers: [AISuggestionController],
  providers: [
    { provide: AI_SUGGESTION_REPOSITORY, useClass: PrismaAISuggestionRepository },
    {
      provide: GetAISuggestionByIdUseCase,
      useFactory: (repository: AISuggestionRepository) => new GetAISuggestionByIdUseCase(repository),
      inject: [AI_SUGGESTION_REPOSITORY],
    },
    { provide: AI_PROVIDER, useClass: NotConfiguredAIProviderAdapter },
    {
      provide: RequestAISuggestionUseCase,
      useFactory: (
        repository: AISuggestionRepository,
        eventDispatcher: DomainEventDispatcher,
        getConsultationSessionByIdUseCase: GetConsultationSessionByIdUseCase,
        getAppointmentByIdUseCase: GetAppointmentByIdUseCase,
        getHealthGraphSubgraphUseCase: GetHealthGraphSubgraphUseCase,
        aiProvider: AIProviderPort,
      ) =>
        new RequestAISuggestionUseCase(
          repository,
          eventDispatcher,
          getConsultationSessionByIdUseCase,
          getAppointmentByIdUseCase,
          getHealthGraphSubgraphUseCase,
          aiProvider,
        ),
      inject: [
        AI_SUGGESTION_REPOSITORY,
        DOMAIN_EVENT_DISPATCHER,
        GetConsultationSessionByIdUseCase,
        GetAppointmentByIdUseCase,
        GetHealthGraphSubgraphUseCase,
        AI_PROVIDER,
      ],
    },
    {
      provide: RecordDoctorDecisionUseCase,
      useFactory: (repository: AISuggestionRepository, eventDispatcher: DomainEventDispatcher) =>
        new RecordDoctorDecisionUseCase(repository, eventDispatcher),
      inject: [AI_SUGGESTION_REPOSITORY, DOMAIN_EVENT_DISPATCHER],
    },
  ],
  exports: [RequestAISuggestionUseCase, RecordDoctorDecisionUseCase],
})
export class AIModule {}
