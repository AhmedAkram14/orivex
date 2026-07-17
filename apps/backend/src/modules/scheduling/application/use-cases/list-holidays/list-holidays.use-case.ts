import type { Holiday } from '../../../domain/entities/holiday.entity.js';
import type { HolidayRepository } from '../../../domain/repositories/holiday.repository.js';

// Global, doctor-agnostic, read-only -- no query params. No create use case
// exists yet (a future Admin feature will populate the table), same
// "real read, deferred write" pattern this module already uses.
export class ListHolidaysUseCase {
  constructor(private readonly holidayRepository: HolidayRepository) {}

  async execute(): Promise<Holiday[]> {
    return this.holidayRepository.findAll();
  }
}
