import { ConfirmAvailabilityWindowCommand } from '../../../../doctor/application/use-cases/confirm-availability-window/confirm-availability-window.command.js';
import type { ConfirmAvailabilityWindowUseCase } from '../../../../doctor/application/use-cases/confirm-availability-window/confirm-availability-window.use-case.js';
import type { AvailabilityWindow } from '../../../../doctor/domain/entities/availability-window.entity.js';

import type { ConfirmSlotCommand } from './confirm-slot.command.js';

// Plain TypeScript class — no NestJS dependency; DI wiring lives in
// scheduling.module.ts only.
//
// SchedulingModule's "confirmSlot()" public interface
// (docs/10-backend-architecture.md's SchedulingModule entry). Delegates
// entirely to DoctorModule's exported ConfirmAvailabilityWindowUseCase.
export class ConfirmSlotUseCase {
  constructor(private readonly confirmAvailabilityWindowUseCase: ConfirmAvailabilityWindowUseCase) {}

  async execute(command: ConfirmSlotCommand): Promise<AvailabilityWindow> {
    return this.confirmAvailabilityWindowUseCase.execute(
      new ConfirmAvailabilityWindowCommand({ availabilityWindowId: command.availabilityWindowId }),
    );
  }
}
