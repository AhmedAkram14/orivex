import type { ScheduleException } from '../entities/schedule-exception.entity.js';

export interface ScheduleExceptionRepository {
  findById(id: string): Promise<ScheduleException | null>;
  // Ordered by date ascending.
  findByDoctorId(doctorId: string): Promise<ScheduleException[]>;
  save(exception: ScheduleException): Promise<void>;
  deleteById(id: string): Promise<void>;
}
