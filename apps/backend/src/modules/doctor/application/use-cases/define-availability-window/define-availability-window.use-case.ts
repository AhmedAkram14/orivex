import { NotFoundError } from '../../../../../shared/errors/app-error.js';
import type { DomainEventDispatcher } from '../../../../../shared/domain/domain-event-dispatcher.js';
import { AvailabilityWindow } from '../../../domain/entities/availability-window.entity.js';
import { DoctorDomainError } from '../../../domain/exceptions/doctor-domain.error.js';
import type { AvailabilityWindowRepository } from '../../../domain/repositories/availability-window.repository.js';
import type { DoctorProfileRepository } from '../../../domain/repositories/doctor-profile.repository.js';

import type { DefineAvailabilityWindowCommand } from './define-availability-window.command.js';

// Plain TypeScript class — no NestJS dependency; DI wiring lives in
// doctor.module.ts only.
//
// Orchestrates: verify the owning DoctorProfile exists -> non-overlap check
// (architect direction: enforced via the repository's findOverlapping
// query, not a database constraint, since a range-overlap check isn't
// expressible as a simple unique index) -> AvailabilityWindow.define() ->
// persist -> dispatch.
export class DefineAvailabilityWindowUseCase {
  constructor(
    private readonly doctorProfileRepository: DoctorProfileRepository,
    private readonly availabilityWindowRepository: AvailabilityWindowRepository,
    private readonly eventDispatcher: DomainEventDispatcher,
  ) {}

  async execute(command: DefineAvailabilityWindowCommand): Promise<AvailabilityWindow> {
    const doctorProfile = await this.doctorProfileRepository.findById(command.doctorId);
    if (!doctorProfile) {
      throw new NotFoundError(`Doctor profile "${command.doctorId}" not found.`);
    }

    const overlapping = await this.availabilityWindowRepository.findOverlapping(
      command.doctorId,
      command.startTime,
      command.endTime,
    );
    if (overlapping.length > 0) {
      throw new DoctorDomainError('This window overlaps an existing availability window for this doctor.');
    }

    const window = AvailabilityWindow.define({
      doctorId: command.doctorId,
      startTime: command.startTime,
      endTime: command.endTime,
      pricing: command.pricing,
    });

    await this.availabilityWindowRepository.save(window);
    await this.eventDispatcher.dispatch(window.releaseDomainEvents());

    return window;
  }
}
