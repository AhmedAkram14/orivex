import { Module } from '@nestjs/common';

import { PinoLoggerService } from '../../platform/logging/pino-logger.service.js';
import { DOMAIN_EVENT_DISPATCHER } from '../../shared/domain/tokens.js';
import type { DomainEvent } from '../../shared/domain/domain-event.js';
import type { DomainEventDispatcher } from '../../shared/domain/domain-event-dispatcher.js';
import { AuthenticationGuardsModule } from '../authentication/authentication-guards.module.js';
import { DoctorModule } from '../doctor/doctor.module.js';
import { GetAvailabilityWindowByIdUseCase } from '../doctor/application/use-cases/get-availability-window-by-id/get-availability-window-by-id.use-case.js';
import { GetDoctorProfileByIdUseCase } from '../doctor/application/use-cases/get-doctor-profile-by-id/get-doctor-profile-by-id.use-case.js';
import { PatientModule } from '../patient/patient.module.js';
import { GetPatientProfileByAccountIdUseCase } from '../patient/application/use-cases/get-patient-profile-by-account-id/get-patient-profile-by-account-id.use-case.js';

import { WAITLIST_ENTRY_REPOSITORY } from './application/ports/tokens.js';
import { CancelWaitlistEntryUseCase } from './application/use-cases/cancel-waitlist-entry/cancel-waitlist-entry.use-case.js';
import { JoinWaitlistUseCase } from './application/use-cases/join-waitlist/join-waitlist.use-case.js';
import { ListWaitlistEntriesForPatientUseCase } from './application/use-cases/list-waitlist-entries-for-patient/list-waitlist-entries-for-patient.use-case.js';
import {
  MatchAvailabilityWithWaitlistUseCase,
  type MatchAvailabilityWithWaitlistCommand,
} from './application/use-cases/match-availability-with-waitlist/match-availability-with-waitlist.use-case.js';
import type { WaitlistEntryRepository } from './domain/repositories/waitlist-entry.repository.js';
import { PrismaWaitlistEntryRepository } from './infrastructure/prisma/prisma-waitlist-entry.repository.js';
import { WaitlistController } from './presentation/controllers/waitlist.controller.js';

// N8-Waitlist (ORIVEX Remaining Work Audit). Imports DoctorModule and
// PatientModule only to consume their own exported use cases
// (module-to-module calls only through a published interface, never
// another module's repository -- docs/10-backend-architecture.md Section
// 11). Neither module imports WaitlistModule back -- no circular imports,
// no forwardRef().
@Module({
  imports: [DoctorModule, PatientModule, AuthenticationGuardsModule],
  controllers: [WaitlistController],
  providers: [
    { provide: WAITLIST_ENTRY_REPOSITORY, useClass: PrismaWaitlistEntryRepository },
    {
      provide: JoinWaitlistUseCase,
      useFactory: (
        repository: WaitlistEntryRepository,
        getPatientProfileByAccountIdUseCase: GetPatientProfileByAccountIdUseCase,
        getDoctorProfileByIdUseCase: GetDoctorProfileByIdUseCase,
      ) => new JoinWaitlistUseCase(repository, getPatientProfileByAccountIdUseCase, getDoctorProfileByIdUseCase),
      inject: [WAITLIST_ENTRY_REPOSITORY, GetPatientProfileByAccountIdUseCase, GetDoctorProfileByIdUseCase],
    },
    {
      provide: ListWaitlistEntriesForPatientUseCase,
      useFactory: (repository: WaitlistEntryRepository, getPatientProfileByAccountIdUseCase: GetPatientProfileByAccountIdUseCase) =>
        new ListWaitlistEntriesForPatientUseCase(repository, getPatientProfileByAccountIdUseCase),
      inject: [WAITLIST_ENTRY_REPOSITORY, GetPatientProfileByAccountIdUseCase],
    },
    {
      provide: CancelWaitlistEntryUseCase,
      useFactory: (repository: WaitlistEntryRepository, getPatientProfileByAccountIdUseCase: GetPatientProfileByAccountIdUseCase) =>
        new CancelWaitlistEntryUseCase(repository, getPatientProfileByAccountIdUseCase),
      inject: [WAITLIST_ENTRY_REPOSITORY, GetPatientProfileByAccountIdUseCase],
    },
    {
      // Registers this module's own event subscriber against the shared
      // DomainEventDispatcher port (mirrors NotificationModule's
      // ScheduleAppointmentReminderHandler pattern exactly): reacts to
      // DoctorModule's already-published 'doctor.availability.changed'
      // event by name only, no import of DoctorModule's event type. This
      // event existed since AvailabilityWindow's very first sprint but had
      // zero subscribers before this.
      provide: MatchAvailabilityWithWaitlistUseCase,
      useFactory: (
        repository: WaitlistEntryRepository,
        getAvailabilityWindowByIdUseCase: GetAvailabilityWindowByIdUseCase,
        dispatcher: DomainEventDispatcher,
        logger: PinoLoggerService,
      ) => {
        const useCase = new MatchAvailabilityWithWaitlistUseCase(repository, getAvailabilityWindowByIdUseCase, dispatcher, logger);
        dispatcher.subscribe('doctor.availability.changed', (event: DomainEvent) =>
          useCase.execute(event as unknown as MatchAvailabilityWithWaitlistCommand),
        );
        return useCase;
      },
      inject: [WAITLIST_ENTRY_REPOSITORY, GetAvailabilityWindowByIdUseCase, DOMAIN_EVENT_DISPATCHER, PinoLoggerService],
    },
  ],
  exports: [],
})
export class WaitlistModule {}
