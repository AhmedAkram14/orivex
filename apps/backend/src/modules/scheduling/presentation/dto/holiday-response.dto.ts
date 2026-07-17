import type { Holiday } from '../../domain/entities/holiday.entity.js';

// Matches the frontend's real Holiday contract exactly (features/scheduling/types.ts).
export class HolidayResponseDto {
  id!: string;
  date!: string;
  name!: string;

  static fromDomain(holiday: Holiday): HolidayResponseDto {
    const dto = new HolidayResponseDto();
    dto.id = holiday.getId();
    dto.date = holiday.getDate();
    dto.name = holiday.getName();
    return dto;
  }
}
