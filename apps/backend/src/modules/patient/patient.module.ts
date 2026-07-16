import { Module } from '@nestjs/common';

import type { DomainEventDispatcher } from '../../shared/domain/domain-event-dispatcher.js';
import { DOMAIN_EVENT_DISPATCHER } from '../../shared/domain/tokens.js';
import { AuthenticationModule } from '../authentication/authentication.module.js';
import { GetAccountByIdUseCase } from '../identity/application/use-cases/get-account-by-id/get-account-by-id.use-case.js';
import { IdentityModule } from '../identity/identity.module.js';

import { PATIENT_PROFILE_REPOSITORY } from './application/ports/tokens.js';
import { CreatePatientProfileUseCase } from './application/use-cases/create-patient-profile/create-patient-profile.use-case.js';
import { GetPatientProfileByAccountIdUseCase } from './application/use-cases/get-patient-profile-by-account-id/get-patient-profile-by-account-id.use-case.js';
import { GetPatientProfileByIdUseCase } from './application/use-cases/get-patient-profile-by-id/get-patient-profile-by-id.use-case.js';
import { UpdatePatientProfileUseCase } from './application/use-cases/update-patient-profile/update-patient-profile.use-case.js';
import type { PatientProfileRepository } from './domain/repositories/patient-profile.repository.js';
import { PrismaPatientProfileRepository } from './infrastructure/prisma/prisma-patient-profile.repository.js';
import { PatientProfileController } from './presentation/controllers/patient-profile.controller.js';

// PatientProfileController is this module's first real HTTP surface (Vertical
// Slice Development directive) -- GET/PATCH /patients/me, scoped to the
// caller's own profile only. Still no /patients CRUD/search/{id} routes
// (docs/12-openapi.md documents none), that composition problem is unchanged.
//
// Imports IdentityModule to consume its exported GetAccountByIdUseCase
// (module-to-module calls only through a published interface, never another
// module's repository — docs/10-backend-architecture.md Section 11).
// Imports AuthenticationModule for JwtAuthGuard/RolesGuard, same pattern
// every other route-protecting module uses.
@Module({
  imports: [IdentityModule, AuthenticationModule],
  controllers: [PatientProfileController],
  providers: [
    { provide: PATIENT_PROFILE_REPOSITORY, useClass: PrismaPatientProfileRepository },
    {
      provide: CreatePatientProfileUseCase,
      useFactory: (
        repository: PatientProfileRepository,
        eventDispatcher: DomainEventDispatcher,
        getAccountByIdUseCase: GetAccountByIdUseCase,
      ) => new CreatePatientProfileUseCase(repository, eventDispatcher, getAccountByIdUseCase),
      inject: [PATIENT_PROFILE_REPOSITORY, DOMAIN_EVENT_DISPATCHER, GetAccountByIdUseCase],
    },
    {
      provide: UpdatePatientProfileUseCase,
      useFactory: (repository: PatientProfileRepository, eventDispatcher: DomainEventDispatcher) =>
        new UpdatePatientProfileUseCase(repository, eventDispatcher),
      inject: [PATIENT_PROFILE_REPOSITORY, DOMAIN_EVENT_DISPATCHER],
    },
    {
      provide: GetPatientProfileByIdUseCase,
      useFactory: (repository: PatientProfileRepository) => new GetPatientProfileByIdUseCase(repository),
      inject: [PATIENT_PROFILE_REPOSITORY],
    },
    {
      provide: GetPatientProfileByAccountIdUseCase,
      useFactory: (repository: PatientProfileRepository) => new GetPatientProfileByAccountIdUseCase(repository),
      inject: [PATIENT_PROFILE_REPOSITORY],
    },
  ],
  exports: [
    CreatePatientProfileUseCase,
    GetPatientProfileByIdUseCase,
    GetPatientProfileByAccountIdUseCase,
    UpdatePatientProfileUseCase,
  ],
})
export class PatientModule {}
