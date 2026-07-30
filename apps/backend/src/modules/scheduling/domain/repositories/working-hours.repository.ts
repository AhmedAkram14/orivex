import type { WorkingHoursDay } from '../entities/working-hours-day.entity.js';

export interface WorkingHoursRepository {
  // Ordered by dayOfWeek is not guaranteed here -- callers (use cases) sort.
  findByDoctorId(doctorId: string): Promise<WorkingHoursDay[]>;
  // Batched sibling for a paginated directory listing's per-doctor signal --
  // one query for the whole page instead of N.
  findByDoctorIds(doctorIds: string[]): Promise<Map<string, WorkingHoursDay[]>>;
  // Full replace-all-7 upsert for a single doctor, in one call so partial
  // writes never leave fewer/more than 7 rows persisted.
  replaceAllForDoctor(doctorId: string, days: WorkingHoursDay[]): Promise<WorkingHoursDay[]>;
}
