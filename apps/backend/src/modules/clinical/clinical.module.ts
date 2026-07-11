import { Module } from '@nestjs/common';

import type { DomainEventDispatcher } from '../../shared/domain/domain-event-dispatcher.js';
import { DOMAIN_EVENT_DISPATCHER } from '../../shared/domain/tokens.js';
import { ConsultationModule } from '../consultation/consultation.module.js';
import { GetConsultationSessionByIdUseCase } from '../consultation/application/use-cases/get-consultation-session-by-id/get-consultation-session-by-id.use-case.js';
import { GetDoctorProfileByIdUseCase } from '../doctor/application/use-cases/get-doctor-profile-by-id/get-doctor-profile-by-id.use-case.js';
import { DoctorModule } from '../doctor/doctor.module.js';
import { GetPatientProfileByIdUseCase } from '../patient/application/use-cases/get-patient-profile-by-id/get-patient-profile-by-id.use-case.js';
import { PatientModule } from '../patient/patient.module.js';

import { CLINICAL_NOTE_REPOSITORY, HEALTH_GRAPH_REPOSITORY, HEALTH_JOURNEY_REPOSITORY } from './application/ports/tokens.js';
import { GetHealthGraphSubgraphUseCase } from './application/use-cases/get-health-graph-subgraph/get-health-graph-subgraph.use-case.js';
import { ListHealthJourneysUseCase } from './application/use-cases/list-health-journeys/list-health-journeys.use-case.js';
import { RecordClinicalNoteUseCase } from './application/use-cases/record-clinical-note/record-clinical-note.use-case.js';
import { RecordDiagnosisUseCase } from './application/use-cases/record-diagnosis/record-diagnosis.use-case.js';
import { UpdateJourneyStageUseCase } from './application/use-cases/update-journey-stage/update-journey-stage.use-case.js';
import type { ClinicalNoteRepository } from './domain/repositories/clinical-note.repository.js';
import type { HealthGraphRepository } from './domain/repositories/health-graph.repository.js';
import type { HealthJourneyRepository } from './domain/repositories/health-journey.repository.js';
import { PrismaClinicalNoteRepository } from './infrastructure/prisma/prisma-clinical-note.repository.js';
import { PrismaHealthGraphRepository } from './infrastructure/prisma/prisma-health-graph.repository.js';
import { PrismaHealthJourneyRepository } from './infrastructure/prisma/prisma-health-journey.repository.js';

// Imports PatientModule, DoctorModule, and ConsultationModule to consume
// their own exported use cases (module-to-module calls only through a
// published interface, never another module's repository —
// docs/10-backend-architecture.md Section 11). None of those modules
// import Clinical back -- no circular imports, no forwardRef().
@Module({
  imports: [PatientModule, DoctorModule, ConsultationModule],
  providers: [
    { provide: HEALTH_GRAPH_REPOSITORY, useClass: PrismaHealthGraphRepository },
    { provide: HEALTH_JOURNEY_REPOSITORY, useClass: PrismaHealthJourneyRepository },
    { provide: CLINICAL_NOTE_REPOSITORY, useClass: PrismaClinicalNoteRepository },
    {
      provide: RecordClinicalNoteUseCase,
      useFactory: (
        repository: ClinicalNoteRepository,
        getConsultationSessionByIdUseCase: GetConsultationSessionByIdUseCase,
        getDoctorProfileByIdUseCase: GetDoctorProfileByIdUseCase,
      ) => new RecordClinicalNoteUseCase(repository, getConsultationSessionByIdUseCase, getDoctorProfileByIdUseCase),
      inject: [CLINICAL_NOTE_REPOSITORY, GetConsultationSessionByIdUseCase, GetDoctorProfileByIdUseCase],
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
  ],
  exports: [
    RecordClinicalNoteUseCase,
    GetHealthGraphSubgraphUseCase,
    ListHealthJourneysUseCase,
    RecordDiagnosisUseCase,
    UpdateJourneyStageUseCase,
  ],
})
export class ClinicalModule {}
