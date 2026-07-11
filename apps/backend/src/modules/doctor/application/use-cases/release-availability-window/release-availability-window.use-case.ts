import { NotFoundError } from '../../../../../shared/errors/app-error.js';
import type { DomainEventDispatcher } from '../../../../../shared/domain/domain-event-dispatcher.js';
import type { AvailabilityWindow } from '../../../domain/entities/availability-window.entity.js';
import type { AvailabilityWindowRepository } from '../../../domain/repositories/availability-window.repository.js';

import type { ReleaseAvailabilityWindowCommand } from './release-availability-window.command.js';

// Plain TypeScript class — no NestJS dependency; DI wiring lives in
// doctor.module.ts only. Exported for SchedulingModule to consume
// (docs/10-backend-architecture.md's SchedulingModule entry: releaseSlot()).
export class ReleaseAvailabilityWindowUseCase {
  constructor(
    private readonly availabilityWindowRepository: AvailabilityWindowRepository,
    private readonly eventDispatcher: DomainEventDispatcher,
  ) {}

  async execute(command: ReleaseAvailabilityWindowCommand): Promise<AvailabilityWindow> {
    const window = await this.availabilityWindowRepository.findById(command.availabilityWindowId);
    if (!window) {
      throw new NotFoundError(`AvailabilityWindow "${command.availabilityWindowId}" not found.`);
    }

    window.release();

    await this.availabilityWindowRepository.save(window);
    await this.eventDispatcher.dispatch(window.releaseDomainEvents());

    return window;
  }
}
