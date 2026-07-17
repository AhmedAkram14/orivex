import { Type } from 'class-transformer';
import { IsIn, IsOptional, IsString, Matches, ValidateNested } from 'class-validator';

import { ScheduleExceptionType } from '../../domain/enums/schedule-exception-type.enum.js';

const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

class TimeRangeRequestDto {
  @IsString()
  @Matches(TIME_PATTERN, { message: 'start must be "HH:mm".' })
  start!: string;

  @IsString()
  @Matches(TIME_PATTERN, { message: 'end must be "HH:mm".' })
  end!: string;
}

export class AddScheduleExceptionRequestDto {
  @IsString()
  @Matches(DATE_PATTERN, { message: 'date must be an ISO date "YYYY-MM-DD".' })
  date!: string;

  @IsIn(Object.values(ScheduleExceptionType))
  type!: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => TimeRangeRequestDto)
  hours?: TimeRangeRequestDto;

  @IsOptional()
  @IsString()
  reason?: string;
}
