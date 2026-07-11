import { Module } from '@nestjs/common';

import { ConfirmAvailabilityWindowUseCase } from '../doctor/application/use-cases/confirm-availability-window/confirm-availability-window.use-case.js';
import { ReleaseAvailabilityWindowUseCase } from '../doctor/application/use-cases/release-availability-window/release-availability-window.use-case.js';
import { ReserveAvailabilityWindowUseCase } from '../doctor/application/use-cases/reserve-availability-window/reserve-availability-window.use-case.js';
import { DoctorModule } from '../doctor/doctor.module.js';

import { ConfirmSlotUseCase } from './application/use-cases/confirm-slot/confirm-slot.use-case.js';
import { ReleaseSlotUseCase } from './application/use-cases/release-slot/release-slot.use-case.js';
import { ReserveSlotUseCase } from './application/use-cases/reserve-slot/reserve-slot.use-case.js';

// Internal orchestration module only -- no controllers, no owned domain
// entities (docs/10-backend-architecture.md's SchedulingModule entry:
// "Owned entities: none of its own"). docs/12-openapi.md's "Scheduling" tag
// has no path operations, so this stays internal until a formal API is
// documented -- same reduced-scope precedent as AdministrationModule.
// Depends one-way on DoctorModule, which remains completely unaware this
// module exists -- no circular imports, no forwardRef(), no repository
// sharing. DoctorModule continues to exclusively own AvailabilityWindow and
// its state-transition use cases.
@Module({
  imports: [DoctorModule],
  providers: [
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
  ],
  exports: [ReserveSlotUseCase, ReleaseSlotUseCase, ConfirmSlotUseCase],
})
export class SchedulingModule {}
