import { NotFoundError } from '../../../../../shared/errors/app-error.js';
import type { DomainEventDispatcher } from '../../../../../shared/domain/domain-event-dispatcher.js';
import type { AvailabilityWindow } from '../../../domain/entities/availability-window.entity.js';
import type { AvailabilityWindowRepository } from '../../../domain/repositories/availability-window.repository.js';

import type { UpdateAvailabilityWindowPricingCommand } from './update-availability-window-pricing.command.js';

// Consultation Pricing Redesign: the per-slot override -- a doctor
// repricing (or flipping Free/Paid on) one already-generated, not-yet-
// booked window without touching the recurring template it came from.
// `AvailabilityWindow.updatePricing()` itself enforces the Open-only
// guard; this use case only adds the ownership check, using the same
// "never leak existence" 404 (not 403) pattern as every other ownership
// check in this codebase -- a doctor probing another doctor's window id
// learns nothing.
export class UpdateAvailabilityWindowPricingUseCase {
  constructor(
    private readonly availabilityWindowRepository: AvailabilityWindowRepository,
    private readonly eventDispatcher: DomainEventDispatcher,
  ) {}

  async execute(command: UpdateAvailabilityWindowPricingCommand): Promise<AvailabilityWindow> {
    const window = await this.availabilityWindowRepository.findById(command.availabilityWindowId);
    if (!window || window.getDoctorId() !== command.requestingDoctorId) {
      throw new NotFoundError(`AvailabilityWindow "${command.availabilityWindowId}" not found.`);
    }

    window.updatePricing(command.pricing);
    await this.availabilityWindowRepository.save(window);
    await this.eventDispatcher.dispatch(window.releaseDomainEvents());

    return window;
  }
}
