import { Module } from '@nestjs/common';

import type { DomainEventDispatcher } from '../../shared/domain/domain-event-dispatcher.js';
import { DOMAIN_EVENT_DISPATCHER } from '../../shared/domain/tokens.js';
import { GetAccountByIdUseCase } from '../identity/application/use-cases/get-account-by-id/get-account-by-id.use-case.js';
import { IdentityModule } from '../identity/identity.module.js';

import { DOCTOR_PROFILE_REPOSITORY } from './application/ports/tokens.js';
import { GetDoctorProfileByIdUseCase } from './application/use-cases/get-doctor-profile-by-id/get-doctor-profile-by-id.use-case.js';
import { RegisterDoctorProfileUseCase } from './application/use-cases/register-doctor-profile/register-doctor-profile.use-case.js';
import { UpdateDoctorProfileUseCase } from './application/use-cases/update-doctor-profile/update-doctor-profile.use-case.js';
import type { DoctorProfileRepository } from './domain/repositories/doctor-profile.repository.js';
import { PrismaDoctorProfileRepository } from './infrastructure/prisma/prisma-doctor-profile.repository.js';
import { DoctorProfileController } from './presentation/controllers/doctor-profile.controller.js';

// Imports IdentityModule to consume its exported GetAccountByIdUseCase
// (module-to-module calls only through a published interface, never
// another module's repository — docs/10-backend-architecture.md Section 11).
@Module({
  imports: [IdentityModule],
  controllers: [DoctorProfileController],
  providers: [
    { provide: DOCTOR_PROFILE_REPOSITORY, useClass: PrismaDoctorProfileRepository },
    {
      provide: RegisterDoctorProfileUseCase,
      useFactory: (
        repository: DoctorProfileRepository,
        eventDispatcher: DomainEventDispatcher,
        getAccountByIdUseCase: GetAccountByIdUseCase,
      ) => new RegisterDoctorProfileUseCase(repository, eventDispatcher, getAccountByIdUseCase),
      inject: [DOCTOR_PROFILE_REPOSITORY, DOMAIN_EVENT_DISPATCHER, GetAccountByIdUseCase],
    },
    {
      provide: UpdateDoctorProfileUseCase,
      useFactory: (repository: DoctorProfileRepository, eventDispatcher: DomainEventDispatcher) =>
        new UpdateDoctorProfileUseCase(repository, eventDispatcher),
      inject: [DOCTOR_PROFILE_REPOSITORY, DOMAIN_EVENT_DISPATCHER],
    },
    {
      provide: GetDoctorProfileByIdUseCase,
      useFactory: (repository: DoctorProfileRepository) => new GetDoctorProfileByIdUseCase(repository),
      inject: [DOCTOR_PROFILE_REPOSITORY],
    },
  ],
  exports: [RegisterDoctorProfileUseCase, GetDoctorProfileByIdUseCase, UpdateDoctorProfileUseCase],
})
export class DoctorModule {}
