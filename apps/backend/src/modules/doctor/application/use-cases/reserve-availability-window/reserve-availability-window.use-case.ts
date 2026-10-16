import { NotFoundError } from '../../../../../shared/errors/app-error.js';
import type { DomainEventDispatcher } from '../../../../../shared/domain/domain-event-dispatcher.js';
import { DEFAULT_HOLD_MINUTES, type AvailabilityWindow } from '../../../domain/entities/availability-window.entity.js';
import type { AvailabilityWindowRepository } from '../../../domain/repositories/availability-window.repository.js';

import type { ReserveAvailabilityWindowCommand } from './reserve-availability-window.command.js';

// Plain TypeScript class — no NestJS dependency; DI wiring lives in
// doctor.module.ts only. Exported for SchedulingModule to consume
// (docs/10-backend-architecture.md's SchedulingModule entry: reserveSlot())
// -- DoctorModule owns the actual state transition; SchedulingModule
// orchestrates only, same pattern as AdministrationModule -> TrustModule.
export class ReserveAvailabilityWindowUseCase {
  constructor(
    private readonly availabilityWindowRepository: AvailabilityWindowRepository,
    private readonly eventDispatcher: DomainEventDispatcher,
  ) {}

  async execute(command: ReserveAvailabilityWindowCommand): Promise<AvailabilityWindow> {
    const window = await this.availabilityWindowRepository.findById(command.availabilityWindowId);
    if (!window) {
      throw new NotFoundError(`AvailabilityWindow "${command.availabilityWindowId}" not found.`);
    }

    // A holdUntil only ever lengthens the hold, never shortens it below the
    // default booking-flow hold.
    const now = new Date();
    const minutesUntil = command.holdUntil ? Math.ceil((command.holdUntil.getTime() - now.getTime()) / 60_000) : 0;
    window.hold(now, minutesUntil > DEFAULT_HOLD_MINUTES ? minutesUntil : undefined);

    await this.availabilityWindowRepository.save(window);
    await this.eventDispatcher.dispatch(window.releaseDomainEvents());

    return window;
  }
}
