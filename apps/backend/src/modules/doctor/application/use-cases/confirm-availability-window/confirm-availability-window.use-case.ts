import { NotFoundError } from '../../../../../shared/errors/app-error.js';
import type { DomainEventDispatcher } from '../../../../../shared/domain/domain-event-dispatcher.js';
import type { AvailabilityWindow } from '../../../domain/entities/availability-window.entity.js';
import type { AvailabilityWindowRepository } from '../../../domain/repositories/availability-window.repository.js';

import type { ConfirmAvailabilityWindowCommand } from './confirm-availability-window.command.js';

// Plain TypeScript class — no NestJS dependency; DI wiring lives in
// doctor.module.ts only. Exported for SchedulingModule to consume
// (docs/10-backend-architecture.md's SchedulingModule entry: confirmSlot()).
export class ConfirmAvailabilityWindowUseCase {
  constructor(
    private readonly availabilityWindowRepository: AvailabilityWindowRepository,
    private readonly eventDispatcher: DomainEventDispatcher,
  ) {}

  async execute(command: ConfirmAvailabilityWindowCommand): Promise<AvailabilityWindow> {
    const window = await this.availabilityWindowRepository.findById(command.availabilityWindowId);
    if (!window) {
      throw new NotFoundError(`AvailabilityWindow "${command.availabilityWindowId}" not found.`);
    }

    // A Requested appointment awaiting doctor approval keeps its window
    // Held for as long as it stays pending -- which can genuinely be hours
    // or days, far past the original short booking-flow hold duration
    // (hold()'s own comment: "a short-lived hold"). `confirm()` itself
    // documents the correct recovery ("a lapsed hold must be re-held
    // first") but nothing upstream of this use case actually did that,
    // so approving anything but a near-instant request always failed with
    // a 409 "hold has expired" conflict. Re-holding here is safe, not a
    // race: while a window is Held, hold() itself refuses anyone else's
    // attempt to claim it (Held && !expired -> conflict), and nothing else
    // in this codebase re-holds a window tied to an existing Requested
    // appointment out from under it -- so an "expired" hold on a window
    // still backing a real pending appointment was never actually
    // contested, just stale bookkeeping.
    if (window.isHoldExpired()) {
      window.hold();
    }
    window.confirm();

    await this.availabilityWindowRepository.save(window);
    await this.eventDispatcher.dispatch(window.releaseDomainEvents());

    return window;
  }
}
