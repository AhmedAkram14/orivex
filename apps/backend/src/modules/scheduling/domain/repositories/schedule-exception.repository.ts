import type { ScheduleException } from '../entities/schedule-exception.entity.js';

export interface ScheduleExceptionRepository {
  findById(id: string): Promise<ScheduleException | null>;
  // Ordered by date ascending.
  findByDoctorId(doctorId: string): Promise<ScheduleException[]>;
  // Batched sibling for a paginated directory listing's per-doctor signal --
  // one query for the whole page and date range instead of N. `dates` are
  // ISO "YYYY-MM-DD" strings.
  findByDoctorIdsAndDates(doctorIds: string[], dates: string[]): Promise<ScheduleException[]>;
  save(exception: ScheduleException): Promise<void>;
  deleteById(id: string): Promise<void>;
}
