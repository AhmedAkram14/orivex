import type { ScheduleException } from '../../domain/entities/schedule-exception.entity.js';

class TimeRangeResponseDto {
  start!: string;
  end!: string;
}

// Matches the frontend's real ScheduleException contract exactly
// (features/scheduling/types.ts).
export class ScheduleExceptionResponseDto {
  id!: string;
  date!: string;
  type!: string;
  hours?: TimeRangeResponseDto;
  reason?: string;

  static fromDomain(exception: ScheduleException): ScheduleExceptionResponseDto {
    const dto = new ScheduleExceptionResponseDto();
    dto.id = exception.getId();
    dto.date = exception.getDate();
    dto.type = exception.getType();
    dto.hours = exception.getHours();
    dto.reason = exception.getReason();
    return dto;
  }
}
