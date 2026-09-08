import { AvailabilityWindowStatus } from '../../../domain/enums/availability-window-status.enum.js';
import { AvailabilityWindowConflictError } from '../../../domain/exceptions/availability-window-conflict.error.js';
import type { AvailabilityWindowRepository } from '../../../domain/repositories/availability-window.repository.js';

import type { VoidStaleAvailabilityWindowCommand } from './void-stale-availability-window.command.js';

// Plain TypeScript class — no NestJS dependency; DI wiring lives in
// doctor.module.ts only. Exported for SchedulingModule to consume
// (GetBookableAvailabilityUseCase's own stale-slot reclamation, see its
// header comment): a never-booked `Open` window materialized under a
// working-hours/rules grid that has since changed carries no real patient
// commitment, so it's safe to permanently remove rather than let it sit
// forever silently blocking the correct new candidate at that time.
//
// The one safety invariant this use case exists to enforce: only ever
// voids a window that is still genuinely `Open` right now (re-checked
// here, not trusted from a caller's possibly-stale read) -- a `Booked` or
// actively-`Held` window represents a real reservation and must never be
// removed through this path, whatever the caller believes about it.
export class VoidStaleAvailabilityWindowUseCase {
  constructor(private readonly availabilityWindowRepository: AvailabilityWindowRepository) {}

  async execute(command: VoidStaleAvailabilityWindowCommand): Promise<void> {
    const window = await this.availabilityWindowRepository.findById(command.availabilityWindowId);
    if (!window) {
      // Already gone -- the desired end state ("this id no longer blocks
      // anything") already holds, so this is a success, not a failure.
      return;
    }

    if (window.getStatus() !== AvailabilityWindowStatus.Open) {
      throw new AvailabilityWindowConflictError(
        `AvailabilityWindow "${command.availabilityWindowId}" is "${window.getStatus()}", not Open; refusing to void a real reservation.`,
      );
    }

    await this.availabilityWindowRepository.deleteById(command.availabilityWindowId);
  }
}
