import { Module } from '@nestjs/common';

import type { DomainEvent } from '../../shared/domain/domain-event.js';
import type { DomainEventDispatcher } from '../../shared/domain/domain-event-dispatcher.js';
import { DOMAIN_EVENT_DISPATCHER } from '../../shared/domain/tokens.js';
import { AssetModule } from '../asset/asset.module.js';
import { AuthenticationModule } from '../authentication/authentication.module.js';
import { ConsultationModule } from '../consultation/consultation.module.js';
import { GetAppointmentByIdUseCase } from '../consultation/application/use-cases/get-appointment-by-id/get-appointment-by-id.use-case.js';
import { GetConsultationFeedbackForSessionUseCase } from '../consultation/application/use-cases/get-consultation-feedback-for-session/get-consultation-feedback-for-session.use-case.js';
import { GetConsultationSessionByIdUseCase } from '../consultation/application/use-cases/get-consultation-session-by-id/get-consultation-session-by-id.use-case.js';
import { GetFollowUpRecommendationForSessionUseCase } from '../consultation/application/use-cases/get-follow-up-recommendation-for-session/get-follow-up-recommendation-for-session.use-case.js';
import { GetDoctorProfileByAccountIdUseCase } from '../doctor/application/use-cases/get-doctor-profile-by-account-id/get-doctor-profile-by-account-id.use-case.js';
import { GetDoctorProfileByIdUseCase } from '../doctor/application/use-cases/get-doctor-profile-by-id/get-doctor-profile-by-id.use-case.js';
import { DoctorModule } from '../doctor/doctor.module.js';
import { IdentityModule } from '../identity/identity.module.js';
import { GetPatientProfileByIdUseCase } from '../patient/application/use-cases/get-patient-profile-by-id/get-patient-profile-by-id.use-case.js';
import { PatientModule } from '../patient/patient.module.js';
import { ReferenceModule } from '../reference/reference.module.js';

import {
  AI_ACKNOWLEDGMENT_EVENT_SUBSCRIBER,
  CLINICAL_NOTE_REPOSITORY,
  HEALTH_GRAPH_REPOSITORY,
  HEALTH_JOURNEY_REPOSITORY,
  PENDING_AI_SUGGESTION_ACKNOWLEDGMENT_REPOSITORY,
  PRESCRIPTION_REPOSITORY,
  VITAL_READING_REPOSITORY,
} from './application/ports/tokens.js';
import {
  PendingAISuggestionAcknowledgmentHandler,
  type AISuggestionDecidedEventPayload,
  type AISuggestionGeneratedEventPayload,
} from './application/event-handlers/pending-ai-suggestion-acknowledgment.handler.js';
import { GetConsultationSummaryUseCase } from './application/use-cases/get-consultation-summary/get-consultation-summary.use-case.js';
import { GetHealthGraphSubgraphUseCase } from './application/use-cases/get-health-graph-subgraph/get-health-graph-subgraph.use-case.js';
import { GetPrescriptionByIdUseCase } from './application/use-cases/get-prescription-by-id/get-prescription-by-id.use-case.js';
import { ListClinicalNotesForConsultationSessionUseCase } from './application/use-cases/list-clinical-notes-for-consultation-session/list-clinical-notes-for-consultation-session.use-case.js';
import { ListVitalReadingsForConsultationSessionUseCase } from './application/use-cases/list-vital-readings-for-consultation-session/list-vital-readings-for-consultation-session.use-case.js';
import { ListHealthJourneysUseCase } from './application/use-cases/list-health-journeys/list-health-journeys.use-case.js';
import { ListPrescriptionsForConsultationSessionUseCase } from './application/use-cases/list-prescriptions-for-consultation-session/list-prescriptions-for-consultation-session.use-case.js';
import { ListVitalReadingsForPatientUseCase } from './application/use-cases/list-vital-readings-for-patient/list-vital-readings-for-patient.use-case.js';
import { RecordClinicalNoteUseCase } from './application/use-cases/record-clinical-note/record-clinical-note.use-case.js';
import { RecordConsultationDiagnosisUseCase } from './application/use-cases/record-consultation-diagnosis/record-consultation-diagnosis.use-case.js';
import { RecordVitalReadingUseCase } from './application/use-cases/record-vital-reading/record-vital-reading.use-case.js';
import { RecordDiagnosisUseCase } from './application/use-cases/record-diagnosis/record-diagnosis.use-case.js';
import { SignPrescriptionUseCase } from './application/use-cases/sign-prescription/sign-prescription.use-case.js';
import { UpdateJourneyStageUseCase } from './application/use-cases/update-journey-stage/update-journey-stage.use-case.js';
import type { ClinicalNoteRepository } from './domain/repositories/clinical-note.repository.js';
import type { HealthGraphRepository } from './domain/repositories/health-graph.repository.js';
import type { HealthJourneyRepository } from './domain/repositories/health-journey.repository.js';
import type { PendingAISuggestionAcknowledgmentRepository } from './domain/repositories/pending-ai-suggestion-acknowledgment.repository.js';
import type { PrescriptionRepository } from './domain/repositories/prescription.repository.js';
import type { VitalReadingRepository } from './domain/repositories/vital-reading.repository.js';
import { PrismaClinicalNoteRepository } from './infrastructure/prisma/prisma-clinical-note.repository.js';
import { PrismaHealthGraphRepository } from './infrastructure/prisma/prisma-health-graph.repository.js';
import { PrismaHealthJourneyRepository } from './infrastructure/prisma/prisma-health-journey.repository.js';
import { PrismaPendingAISuggestionAcknowledgmentRepository } from './infrastructure/prisma/prisma-pending-ai-suggestion-acknowledgment.repository.js';
import { PrismaPrescriptionRepository } from './infrastructure/prisma/prisma-prescription.repository.js';
import { PrismaVitalReadingRepository } from './infrastructure/prisma/prisma-vital-reading.repository.js';
import { ClinicalNoteController } from './presentation/controllers/clinical-note.controller.js';
import { ConsultationSummaryController } from './presentation/controllers/consultation-summary.controller.js';
import { DiagnosisController } from './presentation/controllers/diagnosis.controller.js';
import { VitalsController } from './presentation/controllers/vitals.controller.js';
import { DoctorPatientChartController } from './presentation/controllers/doctor-patient-chart.controller.js';
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
  imports: [PatientModule, DoctorModule, ConsultationModule, IdentityModule, AuthenticationModule, ReferenceModule, AssetModule],
  controllers: [
    ClinicalNoteController,
    HealthGraphController,
    PrescriptionController,
    PatientDashboardController,
    DiagnosisController,
    VitalsController,
    ConsultationSummaryController,
    DoctorPatientChartController,
  ],
  providers: [
    { provide: HEALTH_GRAPH_REPOSITORY, useClass: PrismaHealthGraphRepository },
    { provide: HEALTH_JOURNEY_REPOSITORY, useClass: PrismaHealthJourneyRepository },
    { provide: CLINICAL_NOTE_REPOSITORY, useClass: PrismaClinicalNoteRepository },
    { provide: PRESCRIPTION_REPOSITORY, useClass: PrismaPrescriptionRepository },
    { provide: VITAL_READING_REPOSITORY, useClass: PrismaVitalReadingRepository },
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
    {
      provide: ListVitalReadingsForPatientUseCase,
      useFactory: (repository: VitalReadingRepository) => new ListVitalReadingsForPatientUseCase(repository),
      inject: [VITAL_READING_REPOSITORY],
    },
    {
      provide: ListPrescriptionsForConsultationSessionUseCase,
      useFactory: (repository: PrescriptionRepository) => new ListPrescriptionsForConsultationSessionUseCase(repository),
      inject: [PRESCRIPTION_REPOSITORY],
    },
    {
      provide: ListClinicalNotesForConsultationSessionUseCase,
      useFactory: (repository: ClinicalNoteRepository) => new ListClinicalNotesForConsultationSessionUseCase(repository),
      inject: [CLINICAL_NOTE_REPOSITORY],
    },
    // Consultation lifecycle completion follow-up (2026-07-26).
    {
      provide: RecordConsultationDiagnosisUseCase,
      useFactory: (
        recordDiagnosisUseCase: RecordDiagnosisUseCase,
        getConsultationSessionByIdUseCase: GetConsultationSessionByIdUseCase,
        getAppointmentByIdUseCase: GetAppointmentByIdUseCase,
        getDoctorProfileByAccountIdUseCase: GetDoctorProfileByAccountIdUseCase,
      ) =>
        new RecordConsultationDiagnosisUseCase(
          recordDiagnosisUseCase,
          getConsultationSessionByIdUseCase,
          getAppointmentByIdUseCase,
          getDoctorProfileByAccountIdUseCase,
        ),
      inject: [RecordDiagnosisUseCase, GetConsultationSessionByIdUseCase, GetAppointmentByIdUseCase, GetDoctorProfileByAccountIdUseCase],
    },
    // Real Clinical Vitals Demo pass: same doctor-authorship pattern as
    // RecordConsultationDiagnosisUseCase immediately above.
    {
      provide: RecordVitalReadingUseCase,
      useFactory: (
        vitalReadingRepository: VitalReadingRepository,
        getConsultationSessionByIdUseCase: GetConsultationSessionByIdUseCase,
        getAppointmentByIdUseCase: GetAppointmentByIdUseCase,
        getDoctorProfileByAccountIdUseCase: GetDoctorProfileByAccountIdUseCase,
      ) =>
        new RecordVitalReadingUseCase(
          vitalReadingRepository,
          getConsultationSessionByIdUseCase,
          getAppointmentByIdUseCase,
          getDoctorProfileByAccountIdUseCase,
        ),
      inject: [VITAL_READING_REPOSITORY, GetConsultationSessionByIdUseCase, GetAppointmentByIdUseCase, GetDoctorProfileByAccountIdUseCase],
    },
    {
      provide: ListVitalReadingsForConsultationSessionUseCase,
      useFactory: (repository: VitalReadingRepository) => new ListVitalReadingsForConsultationSessionUseCase(repository),
      inject: [VITAL_READING_REPOSITORY],
    },
    {
      provide: GetConsultationSummaryUseCase,
      useFactory: (
        getConsultationSessionByIdUseCase: GetConsultationSessionByIdUseCase,
        getAppointmentByIdUseCase: GetAppointmentByIdUseCase,
        listClinicalNotesForConsultationSessionUseCase: ListClinicalNotesForConsultationSessionUseCase,
        listPrescriptionsForConsultationSessionUseCase: ListPrescriptionsForConsultationSessionUseCase,
        getHealthGraphSubgraphUseCase: GetHealthGraphSubgraphUseCase,
        getFollowUpRecommendationForSessionUseCase: GetFollowUpRecommendationForSessionUseCase,
        getConsultationFeedbackForSessionUseCase: GetConsultationFeedbackForSessionUseCase,
        listVitalReadingsForConsultationSessionUseCase: ListVitalReadingsForConsultationSessionUseCase,
      ) =>
        new GetConsultationSummaryUseCase(
          getConsultationSessionByIdUseCase,
          getAppointmentByIdUseCase,
          listClinicalNotesForConsultationSessionUseCase,
          listPrescriptionsForConsultationSessionUseCase,
          getHealthGraphSubgraphUseCase,
          getFollowUpRecommendationForSessionUseCase,
          getConsultationFeedbackForSessionUseCase,
          listVitalReadingsForConsultationSessionUseCase,
        ),
      inject: [
        GetConsultationSessionByIdUseCase,
        GetAppointmentByIdUseCase,
        ListClinicalNotesForConsultationSessionUseCase,
        ListPrescriptionsForConsultationSessionUseCase,
        GetHealthGraphSubgraphUseCase,
        GetFollowUpRecommendationForSessionUseCase,
        GetConsultationFeedbackForSessionUseCase,
        ListVitalReadingsForConsultationSessionUseCase,
      ],
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
    ListPrescriptionsForConsultationSessionUseCase,
    ListClinicalNotesForConsultationSessionUseCase,
  ],
})
export class ClinicalModule {}
