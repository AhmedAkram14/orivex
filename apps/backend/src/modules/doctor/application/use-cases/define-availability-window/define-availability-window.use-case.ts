import { NotFoundError } from '../../../../../shared/errors/app-error.js';
import type { DomainEventDispatcher } from '../../../../../shared/domain/domain-event-dispatcher.js';
import { AvailabilityWindow } from '../../../domain/entities/availability-window.entity.js';
import { DoctorDomainError } from '../../../domain/exceptions/doctor-domain.error.js';
import { DoctorFreeSlotDailyCapExceededError } from '../../../domain/exceptions/doctor-free-slot-daily-cap-exceeded.error.js';
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

    // I8 -- Free-tier abuse controls (docs/01-prd.md §7): a doctor-set daily
    // cap on how many FREE windows they open, undefined = no cap. Computed
    // at read time (findByDoctorAndRange already exists for this exact
    // "what does this doctor already have that day" question -- no new
    // repository method needed), never a stored counter.
    const cap = doctorProfile.getMaxFreeSlotsPerDay();
    if (cap !== undefined && command.pricing.isFree()) {
      const dayStart = new Date(Date.UTC(command.startTime.getUTCFullYear(), command.startTime.getUTCMonth(), command.startTime.getUTCDate()));
      const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60_000);
      const existingThatDay = await this.availabilityWindowRepository.findByDoctorAndRange(command.doctorId, dayStart, dayEnd);
      const existingFreeCount = existingThatDay.filter((existing) => existing.getPricing().isFree()).length;
      if (existingFreeCount >= cap) {
        throw new DoctorFreeSlotDailyCapExceededError(
          `This doctor has already reached their daily limit of ${cap} free consultation slot(s) for this day.`,
        );
      }
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
