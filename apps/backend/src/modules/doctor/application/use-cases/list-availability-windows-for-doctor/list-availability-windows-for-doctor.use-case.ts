import type { AvailabilityWindow } from '../../../domain/entities/availability-window.entity.js';
import type { AvailabilityWindowRepository } from '../../../domain/repositories/availability-window.repository.js';

import type { ListAvailabilityWindowsForDoctorQuery } from './list-availability-windows-for-doctor.query.js';

// Onboarding Redesign integration-gap closure (2026-07-25): every
// AvailabilityWindow (any status) for a doctor within [from, to) -- exported
// for SchedulingModule's bookable-availability orchestrator to see what
// already exists before materializing new ones, same one-way
// DoctorModule -> SchedulingModule export pattern as Reserve/Release/
// ConfirmAvailabilityWindow. Pure read.
export class ListAvailabilityWindowsForDoctorUseCase {
  constructor(private readonly availabilityWindowRepository: AvailabilityWindowRepository) {}

  async execute(query: ListAvailabilityWindowsForDoctorQuery): Promise<AvailabilityWindow[]> {
    return this.availabilityWindowRepository.findByDoctorAndRange(query.doctorId, query.from, query.to);
  }
}
