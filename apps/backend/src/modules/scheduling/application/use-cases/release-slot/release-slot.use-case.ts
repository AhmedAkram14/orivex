import { ReleaseAvailabilityWindowCommand } from '../../../../doctor/application/use-cases/release-availability-window/release-availability-window.command.js';
import type { ReleaseAvailabilityWindowUseCase } from '../../../../doctor/application/use-cases/release-availability-window/release-availability-window.use-case.js';
import type { AvailabilityWindow } from '../../../../doctor/domain/entities/availability-window.entity.js';

import type { ReleaseSlotCommand } from './release-slot.command.js';

// Plain TypeScript class — no NestJS dependency; DI wiring lives in
// scheduling.module.ts only.
//
// SchedulingModule's "releaseSlot()" public interface
// (docs/10-backend-architecture.md's SchedulingModule entry). Delegates
// entirely to DoctorModule's exported ReleaseAvailabilityWindowUseCase.
export class ReleaseSlotUseCase {
  constructor(private readonly releaseAvailabilityWindowUseCase: ReleaseAvailabilityWindowUseCase) {}

  async execute(command: ReleaseSlotCommand): Promise<AvailabilityWindow> {
    return this.releaseAvailabilityWindowUseCase.execute(
      new ReleaseAvailabilityWindowCommand({ availabilityWindowId: command.availabilityWindowId }),
    );
  }
}
