import type { WorkingHoursDay } from '../../domain/entities/working-hours-day.entity.js';

class TimeRangeResponseDto {
  start!: string;
  end!: string;
}

// Matches the frontend's real WorkingHoursDay contract exactly
// (features/scheduling/types.ts).
export class WorkingHoursDayResponseDto {
  dayOfWeek!: string;
  isWorkingDay!: boolean;
  hours!: TimeRangeResponseDto;
  breaks!: TimeRangeResponseDto[];

  static fromDomain(day: WorkingHoursDay): WorkingHoursDayResponseDto {
    const dto = new WorkingHoursDayResponseDto();
    dto.dayOfWeek = day.getDayOfWeek();
    dto.isWorkingDay = day.getIsWorkingDay();
    dto.hours = day.getHours();
    dto.breaks = day.getBreaks();
    return dto;
  }
}
