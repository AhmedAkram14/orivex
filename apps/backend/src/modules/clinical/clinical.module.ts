import { Module } from '@nestjs/common';

import type { DomainEvent } from '../../shared/domain/domain-event.js';
import type { DomainEventDispatcher } from '../../shared/domain/domain-event-dispatcher.js';
import { DOMAIN_EVENT_DISPATCHER } from '../../shared/domain/tokens.js';
import { AuthenticationModule } from '../authentication/authentication.module.js';
import { ConsultationModule } from '../consultation/consultation.module.js';
import { GetAppointmentByIdUseCase } from '../consultation/application/use-cases/get-appointment-by-id/get-appointment-by-id.use-case.js';
import { GetConsultationSessionByIdUseCase } from '../consultation/application/use-cases/get-consultation-session-by-id/get-consultation-session-by-id.use-case.js';
import { GetDoctorProfileByIdUseCase } from '../doctor/application/use-cases/get-doctor-profile-by-id/get-doctor-profile-by-id.use-case.js';
import { DoctorModule } from '../doctor/doctor.module.js';
import { IdentityModule } from '../identity/identity.module.js';
import { GetPatientProfileByIdUseCase } from '../patient/application/use-cases/get-patient-profile-by-id/get-patient-profile-by-id.use-case.js';
import { PatientModule } from '../patient/patient.module.js';

import {
  AI_ACKNOWLEDGMENT_EVENT_SUBSCRIBER,
  CLINICAL_NOTE_REPOSITORY,
  HEALTH_GRAPH_REPOSITORY,
  HEALTH_JOURNEY_REPOSITORY,
  PENDING_AI_SUGGESTION_ACKNOWLEDGMENT_REPOSITORY,
  PRESCRIPTION_REPOSITORY,
} from './application/ports/tokens.js';
import {
  PendingAISuggestionAcknowledgmentHandler,
  type AISuggestionDecidedEventPayload,
  type AISuggestionGeneratedEventPayload,
} from './application/event-handlers/pending-ai-suggestion-acknowledgment.handler.js';
import { GetHealthGraphSubgraphUseCase } from './application/use-cases/get-health-graph-subgraph/get-health-graph-subgraph.use-case.js';
import { GetPrescriptionByIdUseCase } from './application/use-cases/get-prescription-by-id/get-prescription-by-id.use-case.js';
import { ListHealthJourneysUseCase } from './application/use-cases/list-health-journeys/list-health-journeys.use-case.js';
import { RecordClinicalNoteUseCase } from './application/use-cases/record-clinical-note/record-clinical-note.use-case.js';
import { RecordDiagnosisUseCase } from './application/use-cases/record-diagnosis/record-diagnosis.use-case.js';
import { SignPrescriptionUseCase } from './application/use-cases/sign-prescription/sign-prescription.use-case.js';
import { UpdateJourneyStageUseCase } from './application/use-cases/update-journey-stage/update-journey-stage.use-case.js';
import type { ClinicalNoteRepository } from './domain/repositories/clinical-note.repository.js';
import type { HealthGraphRepository } from './domain/repositories/health-graph.repository.js';
import type { HealthJourneyRepository } from './domain/repositories/health-journey.repository.js';
import type { PendingAISuggestionAcknowledgmentRepository } from './domain/repositories/pending-ai-suggestion-acknowledgment.repository.js';
import type { PrescriptionRepository } from './domain/repositories/prescription.repository.js';
import { PrismaClinicalNoteRepository } from './infrastructure/prisma/prisma-clinical-note.repository.js';
import { PrismaHealthGraphRepository } from './infrastructure/prisma/prisma-health-graph.repository.js';
import { PrismaHealthJourneyRepository } from './infrastructure/prisma/prisma-health-journey.repository.js';
import { PrismaPendingAISuggestionAcknowledgmentRepository } from './infrastructure/prisma/prisma-pending-ai-suggestion-acknowledgment.repository.js';
import { PrismaPrescriptionRepository } from './infrastructure/prisma/prisma-prescription.repository.js';
import { ClinicalNoteController } from './presentation/controllers/clinical-note.controller.js';
import { HealthGraphController } from './presentation/controllers/health-graph.controller.js';
import { PatientDashboardController } from './presentation/controllers/patient-dashboard.controller.js';
import { PrescriptionController } from './presentation/controllers/prescription.controller.js';

// Imports PatientModule, DoctorModule, ConsultationModule, IdentityModule, and
// AuthenticationModule to consume their own exported use cases/guards
// (module-to-module calls only through a published interface, never another
// module's repository — docs/10-backend-architecture.md Section 11). None of
// those modules import Clinical back -- no circular imports, no
// forwardRef().
@Module({
  imports: [PatientModule, DoctorModule, ConsultationModule, IdentityModule, AuthenticationModule],
  controllers: [ClinicalNoteController, HealthGraphController, PrescriptionController, PatientDashboardController],
  providers: [
    { provide: HEALTH_GRAPH_REPOSITORY, useClass: PrismaHealthGraphRepository },
    { provide: HEALTH_JOURNEY_REPOSITORY, useClass: PrismaHealthJourneyRepository },
    { provide: CLINICAL_NOTE_REPOSITORY, useClass: PrismaClinicalNoteRepository },
    { provide: PRESCRIPTION_REPOSITORY, useClass: PrismaPrescriptionRepository },
    { provide: PENDING_AI_SUGGESTION_ACKNOWLEDGMENT_REPOSITORY, useClass: PrismaPendingAISuggestionAcknowledgmentRepository },
    {
      // Registers Clinical's own event subscriber against the shared
      // DomainEventDispatcher port (docs/10-backend-architecture.md's hard
      // "Clinical never depends on AIModule" rule -- this reacts to
      // AIModule's already-published events by name only, with no import
      // of any AIModule type). Nest instantiates every provider in a
      // module's providers array once at bootstrap, so this factory's
      // subscribe() side effect runs exactly once, before any request is
      // served.
      provide: AI_ACKNOWLEDGMENT_EVENT_SUBSCRIBER,
      useFactory: (repository: PendingAISuggestionAcknowledgmentRepository, dispatcher: DomainEventDispatcher) => {
        const handler = new PendingAISuggestionAcknowledgmentHandler(repository);
        dispatcher.subscribe('ai.suggestion.generated', (event: DomainEvent) =>
          handler.handleSuggestionGenerated(event as unknown as AISuggestionGeneratedEventPayload),
        );
        dispatcher.subscribe('ai.suggestion.decided', (event: DomainEvent) =>
          handler.handleSuggestionDecided(event as unknown as AISuggestionDecidedEventPayload),
        );
        return handler;
      },
      inject: [PENDING_AI_SUGGESTION_ACKNOWLEDGMENT_REPOSITORY, DOMAIN_EVENT_DISPATCHER],
    },
    {
      provide: RecordClinicalNoteUseCase,
      useFactory: (
        repository: ClinicalNoteRepository,
        getConsultationSessionByIdUseCase: GetConsultationSessionByIdUseCase,
        getAppointmentByIdUseCase: GetAppointmentByIdUseCase,
        getDoctorProfileByIdUseCase: GetDoctorProfileByIdUseCase,
      ) =>
        new RecordClinicalNoteUseCase(
          repository,
          getConsultationSessionByIdUseCase,
          getAppointmentByIdUseCase,
          getDoctorProfileByIdUseCase,
        ),
      inject: [CLINICAL_NOTE_REPOSITORY, GetConsultationSessionByIdUseCase, GetAppointmentByIdUseCase, GetDoctorProfileByIdUseCase],
    },
    {
      provide: GetHealthGraphSubgraphUseCase,
      useFactory: (repository: HealthGraphRepository, getPatientProfileByIdUseCase: GetPatientProfileByIdUseCase) =>
        new GetHealthGraphSubgraphUseCase(repository, getPatientProfileByIdUseCase),
      inject: [HEALTH_GRAPH_REPOSITORY, GetPatientProfileByIdUseCase],
    },
    {
      provide: ListHealthJourneysUseCase,
      useFactory: (
        healthGraphRepository: HealthGraphRepository,
        healthJourneyRepository: HealthJourneyRepository,
        getPatientProfileByIdUseCase: GetPatientProfileByIdUseCase,
      ) => new ListHealthJourneysUseCase(healthGraphRepository, healthJourneyRepository, getPatientProfileByIdUseCase),
      inject: [HEALTH_GRAPH_REPOSITORY, HEALTH_JOURNEY_REPOSITORY, GetPatientProfileByIdUseCase],
    },
    {
      provide: RecordDiagnosisUseCase,
      useFactory: (
        healthGraphRepository: HealthGraphRepository,
        healthJourneyRepository: HealthJourneyRepository,
        eventDispatcher: DomainEventDispatcher,
        getPatientProfileByIdUseCase: GetPatientProfileByIdUseCase,
        getDoctorProfileByIdUseCase: GetDoctorProfileByIdUseCase,
      ) =>
        new RecordDiagnosisUseCase(
          healthGraphRepository,
          healthJourneyRepository,
          eventDispatcher,
          getPatientProfileByIdUseCase,
          getDoctorProfileByIdUseCase,
        ),
      inject: [
        HEALTH_GRAPH_REPOSITORY,
        HEALTH_JOURNEY_REPOSITORY,
        DOMAIN_EVENT_DISPATCHER,
        GetPatientProfileByIdUseCase,
        GetDoctorProfileByIdUseCase,
      ],
    },
    {
      provide: UpdateJourneyStageUseCase,
      useFactory: (repository: HealthJourneyRepository, eventDispatcher: DomainEventDispatcher) =>
        new UpdateJourneyStageUseCase(repository, eventDispatcher),
      inject: [HEALTH_JOURNEY_REPOSITORY, DOMAIN_EVENT_DISPATCHER],
    },
    {
      provide: SignPrescriptionUseCase,
      useFactory: (
        repository: PrescriptionRepository,
        eventDispatcher: DomainEventDispatcher,
        getConsultationSessionByIdUseCase: GetConsultationSessionByIdUseCase,
        getAppointmentByIdUseCase: GetAppointmentByIdUseCase,
        getDoctorProfileByIdUseCase: GetDoctorProfileByIdUseCase,
        getHealthGraphSubgraphUseCase: GetHealthGraphSubgraphUseCase,
        pendingAISuggestionAcknowledgmentRepository: PendingAISuggestionAcknowledgmentRepository,
      ) =>
        new SignPrescriptionUseCase(
          repository,
          eventDispatcher,
          getConsultationSessionByIdUseCase,
          getAppointmentByIdUseCase,
          getDoctorProfileByIdUseCase,
          getHealthGraphSubgraphUseCase,
          pendingAISuggestionAcknowledgmentRepository,
        ),
      inject: [
        PRESCRIPTION_REPOSITORY,
        DOMAIN_EVENT_DISPATCHER,
        GetConsultationSessionByIdUseCase,
        GetAppointmentByIdUseCase,
        GetDoctorProfileByIdUseCase,
        GetHealthGraphSubgraphUseCase,
        PENDING_AI_SUGGESTION_ACKNOWLEDGMENT_REPOSITORY,
      ],
    },
    {
      provide: GetPrescriptionByIdUseCase,
      useFactory: (repository: PrescriptionRepository) => new GetPrescriptionByIdUseCase(repository),
      inject: [PRESCRIPTION_REPOSITORY],
    },
  ],
  exports: [
    RecordClinicalNoteUseCase,
    GetHealthGraphSubgraphUseCase,
    ListHealthJourneysUseCase,
    RecordDiagnosisUseCase,
    UpdateJourneyStageUseCase,
    SignPrescriptionUseCase,
    GetPrescriptionByIdUseCase,
  ],
})
export class ClinicalModule {}
