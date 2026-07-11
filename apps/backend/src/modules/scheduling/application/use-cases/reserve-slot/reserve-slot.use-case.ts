import { ReserveAvailabilityWindowCommand } from '../../../../doctor/application/use-cases/reserve-availability-window/reserve-availability-window.command.js';
import type { ReserveAvailabilityWindowUseCase } from '../../../../doctor/application/use-cases/reserve-availability-window/reserve-availability-window.use-case.js';
import type { AvailabilityWindow } from '../../../../doctor/domain/entities/availability-window.entity.js';

import type { ReserveSlotCommand } from './reserve-slot.command.js';

// Plain TypeScript class — no NestJS dependency; DI wiring lives in
// scheduling.module.ts only.
//
// SchedulingModule's "reserveSlot()" public interface
// (docs/10-backend-architecture.md's SchedulingModule entry). Owns no
// persistence of its own -- delegates entirely to DoctorModule's exported
// ReserveAvailabilityWindowUseCase, which owns the actual state transition.
// Same pattern as AdministrationModule -> TrustModule.
export class ReserveSlotUseCase {
  constructor(private readonly reserveAvailabilityWindowUseCase: ReserveAvailabilityWindowUseCase) {}

  async execute(command: ReserveSlotCommand): Promise<AvailabilityWindow> {
    return this.reserveAvailabilityWindowUseCase.execute(
      new ReserveAvailabilityWindowCommand({ availabilityWindowId: command.availabilityWindowId }),
    );
  }
}
