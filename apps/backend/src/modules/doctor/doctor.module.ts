import { Module } from '@nestjs/common';

import type { DomainEvent } from '../../shared/domain/domain-event.js';
import type { DomainEventDispatcher } from '../../shared/domain/domain-event-dispatcher.js';
import { DOMAIN_EVENT_DISPATCHER } from '../../shared/domain/tokens.js';
import { PinoLoggerService } from '../../platform/logging/pino-logger.service.js';
import { AuthenticationGuardsModule } from '../authentication/authentication-guards.module.js';
import { GetAccountByIdUseCase } from '../identity/application/use-cases/get-account-by-id/get-account-by-id.use-case.js';
import { UpdateAccountRoleUseCase } from '../identity/application/use-cases/update-account-role/update-account-role.use-case.js';
import { IdentityModule } from '../identity/identity.module.js';

import { AVAILABILITY_WINDOW_REPOSITORY, DOCTOR_DIRECTORY_QUERY_PORT, DOCTOR_PROFILE_REPOSITORY } from './application/ports/tokens.js';
import type { DoctorDirectoryQueryPort } from './application/ports/doctor-directory-query.port.js';
import { ConfirmAvailabilityWindowUseCase } from './application/use-cases/confirm-availability-window/confirm-availability-window.use-case.js';
import {
  PromoteDoctorRoleOnVerificationHandler,
  type DoctorVerifiedEventPayload,
} from './application/event-handlers/promote-doctor-role-on-verification.handler.js';
import { DefineAvailabilityWindowUseCase } from './application/use-cases/define-availability-window/define-availability-window.use-case.js';
import { GetAvailabilityWindowByIdUseCase } from './application/use-cases/get-availability-window-by-id/get-availability-window-by-id.use-case.js';
import { GetDoctorProfileByAccountIdUseCase } from './application/use-cases/get-doctor-profile-by-account-id/get-doctor-profile-by-account-id.use-case.js';
import { GetDoctorProfileByIdUseCase } from './application/use-cases/get-doctor-profile-by-id/get-doctor-profile-by-id.use-case.js';
import { ListAvailabilityWindowsForDoctorUseCase } from './application/use-cases/list-availability-windows-for-doctor/list-availability-windows-for-doctor.use-case.js';
import { ListDoctorDirectoryUseCase } from './application/use-cases/list-doctor-directory/list-doctor-directory.use-case.js';
import { RegisterDoctorProfileUseCase } from './application/use-cases/register-doctor-profile/register-doctor-profile.use-case.js';
import { ReleaseAvailabilityWindowUseCase } from './application/use-cases/release-availability-window/release-availability-window.use-case.js';
import { ReserveAvailabilityWindowUseCase } from './application/use-cases/reserve-availability-window/reserve-availability-window.use-case.js';
import { UpdateAvailabilityWindowPricingUseCase } from './application/use-cases/update-availability-window-pricing/update-availability-window-pricing.use-case.js';
import { UpdateDoctorProfileUseCase } from './application/use-cases/update-doctor-profile/update-doctor-profile.use-case.js';
import type { AvailabilityWindowRepository } from './domain/repositories/availability-window.repository.js';
import type { DoctorProfileRepository } from './domain/repositories/doctor-profile.repository.js';
import { PrismaAvailabilityWindowRepository } from './infrastructure/prisma/prisma-availability-window.repository.js';
import { PrismaDoctorDirectoryQueryService } from './infrastructure/prisma/prisma-doctor-directory-query.service.js';
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
// Imports AuthenticationGuardsModule (not the full AuthenticationModule) for
// JwtAuthGuard/RolesGuard, needed by the GET/PATCH /doctors/me routes.
// Deliberately the lightweight guards-only module: TrustModule imports
// DoctorModule (GetDoctorProfileByIdUseCase), and AuthenticationModule
// imports TrustModule -- importing the full AuthenticationModule here would
// cycle back to this module. AuthenticationGuardsModule has no such
// dependency, so it can't.
@Module({
  imports: [IdentityModule, AuthenticationGuardsModule],
  controllers: [DoctorProfileController],
  providers: [
    { provide: DOCTOR_PROFILE_REPOSITORY, useClass: PrismaDoctorProfileRepository },
    { provide: AVAILABILITY_WINDOW_REPOSITORY, useClass: PrismaAvailabilityWindowRepository },
    { provide: DOCTOR_DIRECTORY_QUERY_PORT, useClass: PrismaDoctorDirectoryQueryService },
    {
      provide: ListDoctorDirectoryUseCase,
      useFactory: (queryPort: DoctorDirectoryQueryPort) => new ListDoctorDirectoryUseCase(queryPort),
      inject: [DOCTOR_DIRECTORY_QUERY_PORT],
    },
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
      provide: UpdateAvailabilityWindowPricingUseCase,
      useFactory: (repository: AvailabilityWindowRepository, eventDispatcher: DomainEventDispatcher) =>
        new UpdateAvailabilityWindowPricingUseCase(repository, eventDispatcher),
      inject: [AVAILABILITY_WINDOW_REPOSITORY, DOMAIN_EVENT_DISPATCHER],
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
    {
      provide: ListAvailabilityWindowsForDoctorUseCase,
      useFactory: (repository: AvailabilityWindowRepository) => new ListAvailabilityWindowsForDoctorUseCase(repository),
      inject: [AVAILABILITY_WINDOW_REPOSITORY],
    },
    {
      // Registers Doctor Onboarding's own event subscriber against the
      // shared DomainEventDispatcher port (mirrors NotificationModule's
      // ScheduleAppointmentReminderHandler pattern exactly): reacts to
      // TrustModule's already-published 'doctor.verified' event by name
      // only, no import of TrustModule's event type or of TrustModule
      // itself. Nest instantiates every provider in a module's providers
      // array once at bootstrap, so this factory's subscribe() side effect
      // runs exactly once, before any request is served.
      provide: PromoteDoctorRoleOnVerificationHandler,
      useFactory: (
        updateAccountRoleUseCase: UpdateAccountRoleUseCase,
        logger: PinoLoggerService,
        dispatcher: DomainEventDispatcher,
      ) => {
        const handler = new PromoteDoctorRoleOnVerificationHandler(
          updateAccountRoleUseCase,
          logger,
        );
        dispatcher.subscribe('doctor.verified', (event: DomainEvent) =>
          handler.handle(event as unknown as DoctorVerifiedEventPayload),
        );
        return handler;
      },
      inject: [UpdateAccountRoleUseCase, PinoLoggerService, DOMAIN_EVENT_DISPATCHER],
    },
  ],
  exports: [
    RegisterDoctorProfileUseCase,
    GetDoctorProfileByIdUseCase,
    GetDoctorProfileByAccountIdUseCase,
    UpdateDoctorProfileUseCase,
    DefineAvailabilityWindowUseCase,
    UpdateAvailabilityWindowPricingUseCase,
    ReserveAvailabilityWindowUseCase,
    ReleaseAvailabilityWindowUseCase,
    ConfirmAvailabilityWindowUseCase,
    GetAvailabilityWindowByIdUseCase,
    ListAvailabilityWindowsForDoctorUseCase,
  ],
})
export class DoctorModule {}
