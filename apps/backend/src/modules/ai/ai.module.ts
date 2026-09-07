import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OpenAI } from 'openai';

import type { EnvConfig } from '../../core/configuration/env.schema.js';
import type { DomainEventDispatcher } from '../../shared/domain/domain-event-dispatcher.js';
import { DOMAIN_EVENT_DISPATCHER } from '../../shared/domain/tokens.js';
import { AuthenticationGuardsModule } from '../authentication/authentication-guards.module.js';
import { ClinicalModule } from '../clinical/clinical.module.js';
import { GetHealthGraphSubgraphUseCase } from '../clinical/application/use-cases/get-health-graph-subgraph/get-health-graph-subgraph.use-case.js';
import { ConsultationModule } from '../consultation/consultation.module.js';
import { GetAppointmentByIdUseCase } from '../consultation/application/use-cases/get-appointment-by-id/get-appointment-by-id.use-case.js';
import { GetConsultationSessionByIdUseCase } from '../consultation/application/use-cases/get-consultation-session-by-id/get-consultation-session-by-id.use-case.js';
import { DoctorModule } from '../doctor/doctor.module.js';
import { TrustModule } from '../trust/trust.module.js';

import type { AIProviderPort } from './application/ports/ai-provider.port.js';
import { AI_PROVIDER, AI_SUGGESTION_REPOSITORY } from './application/ports/tokens.js';
import { GetAISuggestionByIdUseCase } from './application/use-cases/get-ai-suggestion-by-id/get-ai-suggestion-by-id.use-case.js';
import { RecordDoctorDecisionUseCase } from './application/use-cases/record-doctor-decision/record-doctor-decision.use-case.js';
import { RequestAISuggestionUseCase } from './application/use-cases/request-ai-suggestion/request-ai-suggestion.use-case.js';
import type { AISuggestionRepository } from './domain/repositories/ai-suggestion.repository.js';
import { AzureOpenAIAdapter } from './infrastructure/gateway/azure-openai.adapter.js';
import { NotConfiguredAIProviderAdapter } from './infrastructure/gateway/not-configured-ai-provider.adapter.js';
import { PrismaAISuggestionRepository } from './infrastructure/prisma/prisma-ai-suggestion.repository.js';
import { AISuggestionController } from './presentation/controllers/ai-suggestion.controller.js';

// Imports ClinicalModule (read-only Graph query) and ConsultationModule
// (live consultation/appointment context) to consume their own exported use
// cases (module-to-module calls only through a published interface, never
// another module's repository -- docs/10-backend-architecture.md Section
// 11). None of these modules import AIModule back -- no circular imports,
// no forwardRef(); this is the one-way dependency docs/10-backend-
// architecture.md mandates ("AIModule calls into Clinical's read
// interface, not the reverse"). TrustModule added for RecordAuditLogUseCase
// -- closes the AI-suggestion audit-trail gap the AI Product Surface Audit
// found: AISuggestion already tracks its own decision trail, but every
// other PHI read/clinical write in this codebase also lands in the shared
// AuditLog (C2's audit-trail work); AI requests/decisions didn't. Reuses
// that existing system exactly (AiSuggestionRequested/AiSuggestionDecided
// added to AuditAction) rather than inventing a second one.
//
// AI_PROVIDER binds AzureOpenAIAdapter when AZURE_OPENAI_ENDPOINT/
// AZURE_OPENAI_API_KEY/AZURE_OPENAI_DEPLOYMENT_NAME are all set, falling
// back to NotConfiguredAIProviderAdapter otherwise -- the exact same
// conditional-factory idiom PaymentModule's PAYMENT_GATEWAY binding already
// uses for Stripe. Dependency inversion stays intact either way; the app
// boots cleanly with no provider configured; only an actual
// requestAISuggestion call without one falls back to the documented
// AI-unavailable 202 degraded mode.
//
// No async job-queue infrastructure is introduced this sprint -- generation
// is always synchronous against AIProviderPort, so the 'queued' response
// case from docs/12-openapi.md is deliberately not produced (only
// 'generated' and 'unavailable' are). GetSuggestionHistory (docs/10-
// backend-architecture.md's AIModule query) is also not exposed -- no
// endpoint for it is documented in docs/12-openapi.md.
@Module({
  imports: [ClinicalModule, ConsultationModule, DoctorModule, AuthenticationGuardsModule, TrustModule],
  controllers: [AISuggestionController],
  providers: [
    { provide: AI_SUGGESTION_REPOSITORY, useClass: PrismaAISuggestionRepository },
    {
      provide: GetAISuggestionByIdUseCase,
      useFactory: (repository: AISuggestionRepository) => new GetAISuggestionByIdUseCase(repository),
      inject: [AI_SUGGESTION_REPOSITORY],
    },
    {
      provide: AI_PROVIDER,
      useFactory: (configService: ConfigService<EnvConfig, true>): AIProviderPort => {
        const endpoint = configService.get('AZURE_OPENAI_ENDPOINT', { infer: true });
        const apiKey = configService.get('AZURE_OPENAI_API_KEY', { infer: true });
        const deploymentName = configService.get('AZURE_OPENAI_DEPLOYMENT_NAME', { infer: true });
        if (!endpoint || !apiKey || !deploymentName) {
          return new NotConfiguredAIProviderAdapter();
        }
        // Plain OpenAI client, not AzureOpenAI -- see azure-openai.adapter.ts's
        // own comment: this resource's deployment only resolves through
        // Azure's unified v1 endpoint (endpoint is expected to already end in
        // `/openai/v1`), which is OpenAI-API-compatible by design.
        const client = new OpenAI({ baseURL: endpoint, apiKey });
        return new AzureOpenAIAdapter(client, deploymentName);
      },
      inject: [ConfigService],
    },
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
