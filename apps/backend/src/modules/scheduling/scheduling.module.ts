import { Module } from '@nestjs/common';

import { AuthenticationGuardsModule } from '../authentication/authentication-guards.module.js';
import { ConfirmAvailabilityWindowUseCase } from '../doctor/application/use-cases/confirm-availability-window/confirm-availability-window.use-case.js';
import { ReleaseAvailabilityWindowUseCase } from '../doctor/application/use-cases/release-availability-window/release-availability-window.use-case.js';
import { ReserveAvailabilityWindowUseCase } from '../doctor/application/use-cases/reserve-availability-window/reserve-availability-window.use-case.js';
import { DoctorModule } from '../doctor/doctor.module.js';

import { HOLIDAY_REPOSITORY, SCHEDULE_EXCEPTION_REPOSITORY, WORKING_HOURS_REPOSITORY } from './application/ports/tokens.js';
import { AddScheduleExceptionUseCase } from './application/use-cases/add-schedule-exception/add-schedule-exception.use-case.js';
import { ConfirmSlotUseCase } from './application/use-cases/confirm-slot/confirm-slot.use-case.js';
import { GetDoctorWorkingHoursUseCase } from './application/use-cases/get-doctor-working-hours/get-doctor-working-hours.use-case.js';
import { GetSchedulingRulesUseCase } from './application/use-cases/get-scheduling-rules/get-scheduling-rules.use-case.js';
import { ListHolidaysUseCase } from './application/use-cases/list-holidays/list-holidays.use-case.js';
import { ListScheduleExceptionsForDoctorUseCase } from './application/use-cases/list-schedule-exceptions-for-doctor/list-schedule-exceptions-for-doctor.use-case.js';
import { ReleaseSlotUseCase } from './application/use-cases/release-slot/release-slot.use-case.js';
import { RemoveScheduleExceptionUseCase } from './application/use-cases/remove-schedule-exception/remove-schedule-exception.use-case.js';
import { ReserveSlotUseCase } from './application/use-cases/reserve-slot/reserve-slot.use-case.js';
import { UpdateDoctorWorkingHoursUseCase } from './application/use-cases/update-doctor-working-hours/update-doctor-working-hours.use-case.js';
import type { HolidayRepository } from './domain/repositories/holiday.repository.js';
import type { ScheduleExceptionRepository } from './domain/repositories/schedule-exception.repository.js';
import type { WorkingHoursRepository } from './domain/repositories/working-hours.repository.js';
import { PrismaHolidayRepository } from './infrastructure/prisma/prisma-holiday.repository.js';
import { PrismaScheduleExceptionRepository } from './infrastructure/prisma/prisma-schedule-exception.repository.js';
import { PrismaWorkingHoursRepository } from './infrastructure/prisma/prisma-working-hours.repository.js';
import { SchedulingController } from './presentation/controllers/scheduling.controller.js';

// Owns the doctor's own schedule management (working hours, time-off
// exceptions) plus global read-only Holiday/SchedulingRules data -- the
// first real, controller-owned surface this module has (previously "Owned
// entities: none of its own" per docs/10-backend-architecture.md; that
// changes with this sprint). The Reserve/Release/ConfirmSlot orchestration
// use cases this module already had remain unchanged.
//
// Imports AuthenticationGuardsModule (not the full AuthenticationModule) for
// JwtAuthGuard/RolesGuard -- same reasoning as DoctorModule's own comment:
// AuthenticationModule -> TrustModule -> DoctorModule -> SchedulingModule
// would cycle if this module pulled in the full AuthenticationModule.
// Imports DoctorModule (already imported here) to also consume its exported
// GetDoctorProfileByAccountIdUseCase, resolving "the current doctor"'s own
// id from the JWT's accountId -- reusing the existing use case rather than
// duplicating profile lookup here. DoctorModule remains completely unaware
// SchedulingModule exists -- same one-way pattern as its Reserve/Release/
// ConfirmAvailabilityWindow exports.
@Module({
  imports: [DoctorModule, AuthenticationGuardsModule],
  controllers: [SchedulingController],
  providers: [
    { provide: WORKING_HOURS_REPOSITORY, useClass: PrismaWorkingHoursRepository },
    { provide: SCHEDULE_EXCEPTION_REPOSITORY, useClass: PrismaScheduleExceptionRepository },
    { provide: HOLIDAY_REPOSITORY, useClass: PrismaHolidayRepository },
    {
      provide: ReserveSlotUseCase,
      useFactory: (reserveAvailabilityWindowUseCase: ReserveAvailabilityWindowUseCase) =>
        new ReserveSlotUseCase(reserveAvailabilityWindowUseCase),
      inject: [ReserveAvailabilityWindowUseCase],
    },
    {
      provide: ReleaseSlotUseCase,
      useFactory: (releaseAvailabilityWindowUseCase: ReleaseAvailabilityWindowUseCase) =>
        new ReleaseSlotUseCase(releaseAvailabilityWindowUseCase),
      inject: [ReleaseAvailabilityWindowUseCase],
    },
    {
      provide: ConfirmSlotUseCase,
      useFactory: (confirmAvailabilityWindowUseCase: ConfirmAvailabilityWindowUseCase) =>
        new ConfirmSlotUseCase(confirmAvailabilityWindowUseCase),
      inject: [ConfirmAvailabilityWindowUseCase],
    },
    {
      provide: GetDoctorWorkingHoursUseCase,
      useFactory: (repository: WorkingHoursRepository) => new GetDoctorWorkingHoursUseCase(repository),
      inject: [WORKING_HOURS_REPOSITORY],
    },
    {
      provide: UpdateDoctorWorkingHoursUseCase,
      useFactory: (repository: WorkingHoursRepository) => new UpdateDoctorWorkingHoursUseCase(repository),
      inject: [WORKING_HOURS_REPOSITORY],
    },
    {
      provide: ListScheduleExceptionsForDoctorUseCase,
      useFactory: (repository: ScheduleExceptionRepository) => new ListScheduleExceptionsForDoctorUseCase(repository),
      inject: [SCHEDULE_EXCEPTION_REPOSITORY],
    },
    {
      provide: AddScheduleExceptionUseCase,
      useFactory: (repository: ScheduleExceptionRepository) => new AddScheduleExceptionUseCase(repository),
      inject: [SCHEDULE_EXCEPTION_REPOSITORY],
    },
    {
      provide: RemoveScheduleExceptionUseCase,
      useFactory: (repository: ScheduleExceptionRepository) => new RemoveScheduleExceptionUseCase(repository),
      inject: [SCHEDULE_EXCEPTION_REPOSITORY],
    },
    {
      provide: ListHolidaysUseCase,
      useFactory: (repository: HolidayRepository) => new ListHolidaysUseCase(repository),
      inject: [HOLIDAY_REPOSITORY],
    },
    GetSchedulingRulesUseCase,
  ],
  exports: [ReserveSlotUseCase, ReleaseSlotUseCase, ConfirmSlotUseCase],
})
export class SchedulingModule {}
