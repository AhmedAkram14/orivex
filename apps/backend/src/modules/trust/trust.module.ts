import { Module } from '@nestjs/common';

import type { DomainEventDispatcher } from '../../shared/domain/domain-event-dispatcher.js';
import { DOMAIN_EVENT_DISPATCHER } from '../../shared/domain/tokens.js';
import { AuthenticationGuardsModule } from '../authentication/authentication-guards.module.js';
import { ConsultationModule } from '../consultation/consultation.module.js';
import { GetDoctorProfileByIdUseCase } from '../doctor/application/use-cases/get-doctor-profile-by-id/get-doctor-profile-by-id.use-case.js';
import { DoctorModule } from '../doctor/doctor.module.js';
import { IdentityModule } from '../identity/identity.module.js';
import { GetPatientProfileByIdUseCase } from '../patient/application/use-cases/get-patient-profile-by-id/get-patient-profile-by-id.use-case.js';
import { PatientModule } from '../patient/patient.module.js';
import { GetConsentScopeCategoryByCodeUseCase } from '../reference/application/use-cases/get-consent-scope-category-by-code/get-consent-scope-category-by-code.use-case.js';
import { ReferenceModule } from '../reference/reference.module.js';

import { AUDIT_LOG_REPOSITORY, CONSENT_RECORD_REPOSITORY, SECURITY_EVENT_REPOSITORY, VERIFICATION_CASE_REPOSITORY } from './application/ports/tokens.js';
import { DecideVerificationUseCase } from './application/use-cases/decide-verification/decide-verification.use-case.js';
import { GetConsentStateUseCase } from './application/use-cases/get-consent-state/get-consent-state.use-case.js';
import { GetVerificationCaseByIdUseCase } from './application/use-cases/get-verification-case-by-id/get-verification-case-by-id.use-case.js';
import { GrantConsentUseCase } from './application/use-cases/grant-consent/grant-consent.use-case.js';
import { ListConsentHistoryForPatientUseCase } from './application/use-cases/list-consent-history-for-patient/list-consent-history-for-patient.use-case.js';
import { ListPendingVerificationCasesUseCase } from './application/use-cases/list-pending-verification-cases/list-pending-verification-cases.use-case.js';
import { ListRevokedDoctorsForPatientUseCase } from './application/use-cases/list-revoked-doctors-for-patient/list-revoked-doctors-for-patient.use-case.js';
import { ListSecurityEventsForAccountUseCase } from './application/use-cases/list-security-events-for-account/list-security-events-for-account.use-case.js';
import { ListVerificationCasesForSubjectUseCase } from './application/use-cases/list-verification-cases-for-subject/list-verification-cases-for-subject.use-case.js';
import { RecordAuditLogUseCase } from './application/use-cases/record-audit-log/record-audit-log.use-case.js';
import { RecordSecurityEventUseCase } from './application/use-cases/record-security-event/record-security-event.use-case.js';
import { RevokeConsentUseCase } from './application/use-cases/revoke-consent/revoke-consent.use-case.js';
import { SubmitDoctorVerificationUseCase } from './application/use-cases/submit-doctor-verification/submit-doctor-verification.use-case.js';
import { SubmitPatientVerificationUseCase } from './application/use-cases/submit-patient-verification/submit-patient-verification.use-case.js';
import { SuspendVerificationCaseUseCase } from './application/use-cases/suspend-verification-case/suspend-verification-case.use-case.js';
import type { AuditLogRepository } from './domain/repositories/audit-log.repository.js';
import type { ConsentRecordRepository } from './domain/repositories/consent-record.repository.js';
import type { SecurityEventRepository } from './domain/repositories/security-event.repository.js';
import type { VerificationCaseRepository } from './domain/repositories/verification-case.repository.js';
import { PrismaAuditLogRepository } from './infrastructure/prisma/prisma-audit-log.repository.js';
import { PrismaConsentRecordRepository } from './infrastructure/prisma/prisma-consent-record.repository.js';
import { PrismaSecurityEventRepository } from './infrastructure/prisma/prisma-security-event.repository.js';
import { ConsentController } from './presentation/controllers/consent.controller.js';
import { DoctorVerificationController } from './presentation/controllers/doctor-verification.controller.js';
import { PatientVerificationController } from './presentation/controllers/patient-verification.controller.js';
import { VerificationCaseController } from './presentation/controllers/verification-case.controller.js';
import { TrustGuardsModule } from './trust-guards.module.js';

// Imports DoctorModule/PatientModule to consume their exported profile-lookup
// use cases (module-to-module calls only through a published interface,
// never another module's repository — docs/10-backend-architecture.md
// Section 11). Does NOT import AssetModule: document asset ids are
// referenced by id only, with existence enforced by the database FK on
// VerificationDocument, not a cross-module query. ConsultationModule/
// IdentityModule/ReferenceModule added for ConsentController's own read
// composition (patient's appointment history, doctor account display name,
// consent scope category resolution) -- none of the three import TrustModule
// back, so no cycle.
@Module({
  imports: [DoctorModule, PatientModule, AuthenticationGuardsModule, TrustGuardsModule, ConsultationModule, IdentityModule, ReferenceModule],
  controllers: [DoctorVerificationController, PatientVerificationController, VerificationCaseController, ConsentController],
  providers: [
    { provide: SECURITY_EVENT_REPOSITORY, useClass: PrismaSecurityEventRepository },
    { provide: AUDIT_LOG_REPOSITORY, useClass: PrismaAuditLogRepository },
    { provide: CONSENT_RECORD_REPOSITORY, useClass: PrismaConsentRecordRepository },
    {
      provide: RecordSecurityEventUseCase,
      useFactory: (repository: SecurityEventRepository) => new RecordSecurityEventUseCase(repository),
      inject: [SECURITY_EVENT_REPOSITORY],
    },
    {
      provide: RecordAuditLogUseCase,
      useFactory: (repository: AuditLogRepository) => new RecordAuditLogUseCase(repository),
      inject: [AUDIT_LOG_REPOSITORY],
    },
    {
      provide: GetConsentStateUseCase,
      useFactory: (repository: ConsentRecordRepository, getScope: GetConsentScopeCategoryByCodeUseCase) =>
        new GetConsentStateUseCase(repository, getScope),
      inject: [CONSENT_RECORD_REPOSITORY, GetConsentScopeCategoryByCodeUseCase],
    },
    {
      provide: GrantConsentUseCase,
      useFactory: (
        repository: ConsentRecordRepository,
        getScope: GetConsentScopeCategoryByCodeUseCase,
        eventDispatcher: DomainEventDispatcher,
      ) => new GrantConsentUseCase(repository, getScope, eventDispatcher),
      inject: [CONSENT_RECORD_REPOSITORY, GetConsentScopeCategoryByCodeUseCase, DOMAIN_EVENT_DISPATCHER],
    },
    {
      provide: RevokeConsentUseCase,
      useFactory: (
        repository: ConsentRecordRepository,
        getScope: GetConsentScopeCategoryByCodeUseCase,
        eventDispatcher: DomainEventDispatcher,
      ) => new RevokeConsentUseCase(repository, getScope, eventDispatcher),
      inject: [CONSENT_RECORD_REPOSITORY, GetConsentScopeCategoryByCodeUseCase, DOMAIN_EVENT_DISPATCHER],
    },
    {
      provide: ListConsentHistoryForPatientUseCase,
      useFactory: (repository: ConsentRecordRepository) => new ListConsentHistoryForPatientUseCase(repository),
      inject: [CONSENT_RECORD_REPOSITORY],
    },
    {
      provide: ListRevokedDoctorsForPatientUseCase,
      useFactory: (repository: ConsentRecordRepository, getScope: GetConsentScopeCategoryByCodeUseCase) =>
        new ListRevokedDoctorsForPatientUseCase(repository, getScope),
      inject: [CONSENT_RECORD_REPOSITORY, GetConsentScopeCategoryByCodeUseCase],
    },
    {
      provide: ListSecurityEventsForAccountUseCase,
      useFactory: (repository: SecurityEventRepository) => new ListSecurityEventsForAccountUseCase(repository),
      inject: [SECURITY_EVENT_REPOSITORY],
    },
    {
      provide: SubmitDoctorVerificationUseCase,
      useFactory: (
        repository: VerificationCaseRepository,
        eventDispatcher: DomainEventDispatcher,
        getDoctorProfileByIdUseCase: GetDoctorProfileByIdUseCase,
      ) => new SubmitDoctorVerificationUseCase(repository, eventDispatcher, getDoctorProfileByIdUseCase),
      inject: [VERIFICATION_CASE_REPOSITORY, DOMAIN_EVENT_DISPATCHER, GetDoctorProfileByIdUseCase],
    },
    {
      provide: SubmitPatientVerificationUseCase,
      useFactory: (
        repository: VerificationCaseRepository,
        eventDispatcher: DomainEventDispatcher,
        getPatientProfileByIdUseCase: GetPatientProfileByIdUseCase,
      ) => new SubmitPatientVerificationUseCase(repository, eventDispatcher, getPatientProfileByIdUseCase),
      inject: [VERIFICATION_CASE_REPOSITORY, DOMAIN_EVENT_DISPATCHER, GetPatientProfileByIdUseCase],
    },
    {
      provide: DecideVerificationUseCase,
      useFactory: (repository: VerificationCaseRepository, eventDispatcher: DomainEventDispatcher) =>
        new DecideVerificationUseCase(repository, eventDispatcher),
      inject: [VERIFICATION_CASE_REPOSITORY, DOMAIN_EVENT_DISPATCHER],
    },
    {
      provide: SuspendVerificationCaseUseCase,
      useFactory: (repository: VerificationCaseRepository, eventDispatcher: DomainEventDispatcher) =>
        new SuspendVerificationCaseUseCase(repository, eventDispatcher),
      inject: [VERIFICATION_CASE_REPOSITORY, DOMAIN_EVENT_DISPATCHER],
    },
    {
      provide: ListPendingVerificationCasesUseCase,
      useFactory: (repository: VerificationCaseRepository) => new ListPendingVerificationCasesUseCase(repository),
      inject: [VERIFICATION_CASE_REPOSITORY],
    },
    {
      provide: ListVerificationCasesForSubjectUseCase,
      useFactory: (repository: VerificationCaseRepository) => new ListVerificationCasesForSubjectUseCase(repository),
      inject: [VERIFICATION_CASE_REPOSITORY],
    },
    {
      provide: GetVerificationCaseByIdUseCase,
      useFactory: (repository: VerificationCaseRepository) => new GetVerificationCaseByIdUseCase(repository),
      inject: [VERIFICATION_CASE_REPOSITORY],
    },
  ],
  exports: [
    SubmitDoctorVerificationUseCase,
    SubmitPatientVerificationUseCase,
    DecideVerificationUseCase,
    SuspendVerificationCaseUseCase,
    ListPendingVerificationCasesUseCase,
    ListVerificationCasesForSubjectUseCase,
    GetVerificationCaseByIdUseCase,
    RecordSecurityEventUseCase,
    ListSecurityEventsForAccountUseCase,
    RecordAuditLogUseCase,
    GetConsentStateUseCase,
  ],
})
export class TrustModule {}
