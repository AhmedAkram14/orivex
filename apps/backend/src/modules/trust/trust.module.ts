import { Module } from '@nestjs/common';

import type { DomainEventDispatcher } from '../../shared/domain/domain-event-dispatcher.js';
import { DOMAIN_EVENT_DISPATCHER } from '../../shared/domain/tokens.js';
import { GetDoctorProfileByIdUseCase } from '../doctor/application/use-cases/get-doctor-profile-by-id/get-doctor-profile-by-id.use-case.js';
import { DoctorModule } from '../doctor/doctor.module.js';

import { VERIFICATION_CASE_REPOSITORY } from './application/ports/tokens.js';
import { DecideVerificationUseCase } from './application/use-cases/decide-verification/decide-verification.use-case.js';
import { ListPendingVerificationCasesUseCase } from './application/use-cases/list-pending-verification-cases/list-pending-verification-cases.use-case.js';
import { SubmitDoctorVerificationUseCase } from './application/use-cases/submit-doctor-verification/submit-doctor-verification.use-case.js';
import type { VerificationCaseRepository } from './domain/repositories/verification-case.repository.js';
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
  imports: [DoctorModule],
  controllers: [DoctorVerificationController, VerificationCaseController],
  providers: [
    { provide: VERIFICATION_CASE_REPOSITORY, useClass: PrismaVerificationCaseRepository },
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
  ],
  exports: [SubmitDoctorVerificationUseCase, DecideVerificationUseCase, ListPendingVerificationCasesUseCase],
})
export class TrustModule {}
