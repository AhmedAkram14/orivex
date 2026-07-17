import type { Holiday } from '../entities/holiday.entity.js';

export interface HolidayRepository {
  // Ordered by date ascending.
  findAll(): Promise<Holiday[]>;
}
