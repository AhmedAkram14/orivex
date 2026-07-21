import { Module } from '@nestjs/common';

import type { DomainEventDispatcher } from '../../shared/domain/domain-event-dispatcher.js';
import { DOMAIN_EVENT_DISPATCHER } from '../../shared/domain/tokens.js';
import { AuthenticationGuardsModule } from '../authentication/authentication-guards.module.js';
import { GetDoctorProfileByIdUseCase } from '../doctor/application/use-cases/get-doctor-profile-by-id/get-doctor-profile-by-id.use-case.js';
import { DoctorModule } from '../doctor/doctor.module.js';

import { SECURITY_EVENT_REPOSITORY, VERIFICATION_CASE_REPOSITORY } from './application/ports/tokens.js';
import { DecideVerificationUseCase } from './application/use-cases/decide-verification/decide-verification.use-case.js';
import { ListPendingVerificationCasesUseCase } from './application/use-cases/list-pending-verification-cases/list-pending-verification-cases.use-case.js';
import { ListSecurityEventsForAccountUseCase } from './application/use-cases/list-security-events-for-account/list-security-events-for-account.use-case.js';
import { ListVerificationCasesForDoctorUseCase } from './application/use-cases/list-verification-cases-for-doctor/list-verification-cases-for-doctor.use-case.js';
import { RecordSecurityEventUseCase } from './application/use-cases/record-security-event/record-security-event.use-case.js';
import { SubmitDoctorVerificationUseCase } from './application/use-cases/submit-doctor-verification/submit-doctor-verification.use-case.js';
import type { SecurityEventRepository } from './domain/repositories/security-event.repository.js';
import type { VerificationCaseRepository } from './domain/repositories/verification-case.repository.js';
import { PrismaSecurityEventRepository } from './infrastructure/prisma/prisma-security-event.repository.js';
import { PrismaVerificationCaseRepository } from './infrastructure/prisma/prisma-verification-case.repository.js';
import { DoctorVerificationController } from './presentation/controllers/doctor-verification.controller.js';
import { VerificationCaseController } from './presentation/controllers/verification-case.controller.js';

// Imports DoctorModule to consume its exported GetDoctorProfileByIdUseCase
// (module-to-module calls only through a published interface, never another
// module's repository — docs/10-backend-architecture.md Section 11). Does
// NOT import AssetModule: document asset ids are referenced by id only, with
// existence enforced by the database FK on VerificationDocument, not a
// cross-module query.
@Module({
  imports: [DoctorModule, AuthenticationGuardsModule],
  controllers: [DoctorVerificationController, VerificationCaseController],
  providers: [
    { provide: VERIFICATION_CASE_REPOSITORY, useClass: PrismaVerificationCaseRepository },
    { provide: SECURITY_EVENT_REPOSITORY, useClass: PrismaSecurityEventRepository },
    {
      provide: RecordSecurityEventUseCase,
      useFactory: (repository: SecurityEventRepository) => new RecordSecurityEventUseCase(repository),
      inject: [SECURITY_EVENT_REPOSITORY],
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
      provide: DecideVerificationUseCase,
      useFactory: (repository: VerificationCaseRepository, eventDispatcher: DomainEventDispatcher) =>
        new DecideVerificationUseCase(repository, eventDispatcher),
      inject: [VERIFICATION_CASE_REPOSITORY, DOMAIN_EVENT_DISPATCHER],
    },
    {
      provide: ListPendingVerificationCasesUseCase,
      useFactory: (repository: VerificationCaseRepository) => new ListPendingVerificationCasesUseCase(repository),
      inject: [VERIFICATION_CASE_REPOSITORY],
    },
    {
      provide: ListVerificationCasesForDoctorUseCase,
      useFactory: (repository: VerificationCaseRepository) => new ListVerificationCasesForDoctorUseCase(repository),
      inject: [VERIFICATION_CASE_REPOSITORY],
    },
  ],
  exports: [
    SubmitDoctorVerificationUseCase,
    DecideVerificationUseCase,
    ListPendingVerificationCasesUseCase,
    ListVerificationCasesForDoctorUseCase,
    RecordSecurityEventUseCase,
    ListSecurityEventsForAccountUseCase,
  ],
})
export class TrustModule {}
