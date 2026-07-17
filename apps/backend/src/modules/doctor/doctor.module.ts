import { Module } from '@nestjs/common';

import type { DomainEventDispatcher } from '../../shared/domain/domain-event-dispatcher.js';
import { DOMAIN_EVENT_DISPATCHER } from '../../shared/domain/tokens.js';
import { AuthenticationModule } from '../authentication/authentication.module.js';
import { GetAccountByIdUseCase } from '../identity/application/use-cases/get-account-by-id/get-account-by-id.use-case.js';
import { IdentityModule } from '../identity/identity.module.js';

import { AVAILABILITY_WINDOW_REPOSITORY, DOCTOR_PROFILE_REPOSITORY } from './application/ports/tokens.js';
import { ConfirmAvailabilityWindowUseCase } from './application/use-cases/confirm-availability-window/confirm-availability-window.use-case.js';
import { DefineAvailabilityWindowUseCase } from './application/use-cases/define-availability-window/define-availability-window.use-case.js';
import { GetAvailabilityWindowByIdUseCase } from './application/use-cases/get-availability-window-by-id/get-availability-window-by-id.use-case.js';
import { GetDoctorProfileByAccountIdUseCase } from './application/use-cases/get-doctor-profile-by-account-id/get-doctor-profile-by-account-id.use-case.js';
import { GetDoctorProfileByIdUseCase } from './application/use-cases/get-doctor-profile-by-id/get-doctor-profile-by-id.use-case.js';
import { RegisterDoctorProfileUseCase } from './application/use-cases/register-doctor-profile/register-doctor-profile.use-case.js';
import { ReleaseAvailabilityWindowUseCase } from './application/use-cases/release-availability-window/release-availability-window.use-case.js';
import { ReserveAvailabilityWindowUseCase } from './application/use-cases/reserve-availability-window/reserve-availability-window.use-case.js';
import { UpdateDoctorProfileUseCase } from './application/use-cases/update-doctor-profile/update-doctor-profile.use-case.js';
import type { AvailabilityWindowRepository } from './domain/repositories/availability-window.repository.js';
import type { DoctorProfileRepository } from './domain/repositories/doctor-profile.repository.js';
import { PrismaAvailabilityWindowRepository } from './infrastructure/prisma/prisma-availability-window.repository.js';
import { PrismaDoctorProfileRepository } from './infrastructure/prisma/prisma-doctor-profile.repository.js';
import { DoctorProfileController } from './presentation/controllers/doctor-profile.controller.js';

// Imports IdentityModule to consume its exported GetAccountByIdUseCase
// (module-to-module calls only through a published interface, never
// another module's repository — docs/10-backend-architecture.md Section 11).
//
// AvailabilityWindow's Reserve/Release/Confirm use cases are exported for
// SchedulingModule (Sprint 7) to consume -- DoctorModule remains unaware
// SchedulingModule exists, same one-way pattern as
// AdministrationModule -> TrustModule.
//
// Imports AuthenticationModule for JwtAuthGuard/RolesGuard, needed by the
// GET/PATCH /doctors/me routes (same pattern PatientModule uses).
@Module({
  imports: [IdentityModule, AuthenticationModule],
  controllers: [DoctorProfileController],
  providers: [
    { provide: DOCTOR_PROFILE_REPOSITORY, useClass: PrismaDoctorProfileRepository },
    { provide: AVAILABILITY_WINDOW_REPOSITORY, useClass: PrismaAvailabilityWindowRepository },
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
    {
      provide: GetDoctorProfileByAccountIdUseCase,
      useFactory: (repository: DoctorProfileRepository) => new GetDoctorProfileByAccountIdUseCase(repository),
      inject: [DOCTOR_PROFILE_REPOSITORY],
    },
    {
      provide: DefineAvailabilityWindowUseCase,
      useFactory: (
        doctorProfileRepository: DoctorProfileRepository,
        availabilityWindowRepository: AvailabilityWindowRepository,
        eventDispatcher: DomainEventDispatcher,
      ) => new DefineAvailabilityWindowUseCase(doctorProfileRepository, availabilityWindowRepository, eventDispatcher),
      inject: [DOCTOR_PROFILE_REPOSITORY, AVAILABILITY_WINDOW_REPOSITORY, DOMAIN_EVENT_DISPATCHER],
    },
    {
      provide: ReserveAvailabilityWindowUseCase,
      useFactory: (repository: AvailabilityWindowRepository, eventDispatcher: DomainEventDispatcher) =>
        new ReserveAvailabilityWindowUseCase(repository, eventDispatcher),
      inject: [AVAILABILITY_WINDOW_REPOSITORY, DOMAIN_EVENT_DISPATCHER],
    },
    {
      provide: ReleaseAvailabilityWindowUseCase,
      useFactory: (repository: AvailabilityWindowRepository, eventDispatcher: DomainEventDispatcher) =>
        new ReleaseAvailabilityWindowUseCase(repository, eventDispatcher),
      inject: [AVAILABILITY_WINDOW_REPOSITORY, DOMAIN_EVENT_DISPATCHER],
    },
    {
      provide: ConfirmAvailabilityWindowUseCase,
      useFactory: (repository: AvailabilityWindowRepository, eventDispatcher: DomainEventDispatcher) =>
        new ConfirmAvailabilityWindowUseCase(repository, eventDispatcher),
      inject: [AVAILABILITY_WINDOW_REPOSITORY, DOMAIN_EVENT_DISPATCHER],
    },
    {
      provide: GetAvailabilityWindowByIdUseCase,
      useFactory: (repository: AvailabilityWindowRepository) => new GetAvailabilityWindowByIdUseCase(repository),
      inject: [AVAILABILITY_WINDOW_REPOSITORY],
    },
  ],
  exports: [
    RegisterDoctorProfileUseCase,
    GetDoctorProfileByIdUseCase,
    GetDoctorProfileByAccountIdUseCase,
    UpdateDoctorProfileUseCase,
    DefineAvailabilityWindowUseCase,
    ReserveAvailabilityWindowUseCase,
    ReleaseAvailabilityWindowUseCase,
    ConfirmAvailabilityWindowUseCase,
    GetAvailabilityWindowByIdUseCase,
  ],
})
export class DoctorModule {}
