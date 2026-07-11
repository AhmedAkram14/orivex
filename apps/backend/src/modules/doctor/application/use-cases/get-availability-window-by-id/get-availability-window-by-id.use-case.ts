import type { AvailabilityWindow } from '../../../domain/entities/availability-window.entity.js';
import type { AvailabilityWindowRepository } from '../../../domain/repositories/availability-window.repository.js';

import type { GetAvailabilityWindowByIdQuery } from './get-availability-window-by-id.query.js';

// Pure read — returns null on absence rather than throwing (mirrors
// GetDoctorProfileByIdUseCase's pattern).
export class GetAvailabilityWindowByIdUseCase {
  constructor(private readonly availabilityWindowRepository: AvailabilityWindowRepository) {}

  async execute(query: GetAvailabilityWindowByIdQuery): Promise<AvailabilityWindow | null> {
    return this.availabilityWindowRepository.findById(query.availabilityWindowId);
  }
}
