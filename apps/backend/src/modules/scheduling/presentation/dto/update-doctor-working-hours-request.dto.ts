import { Type } from 'class-transformer';
import { IsArray, IsBoolean, IsIn, IsNumber, IsOptional, IsPositive, IsString, Matches, ValidateNested } from 'class-validator';

import { ALL_WEEK_DAYS } from '../../domain/enums/week-day.enum.js';

const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;

class TimeRangeRequestDto {
  @IsString()
  @Matches(TIME_PATTERN, { message: 'start must be "HH:mm".' })
  start!: string;

  @IsString()
  @Matches(TIME_PATTERN, { message: 'end must be "HH:mm".' })
  end!: string;
}

// Consultation Pricing Redesign: the recurring template's own per-weekday
// default price. Omitted (or pricingType 'free') -- this weekday's
// generated slots are free, matching the entity's own default.
export class PricingRequestDto {
  @IsIn(['free', 'paid'])
  pricingType!: 'free' | 'paid';

  @IsOptional()
  @IsNumber()
  @IsPositive()
  feeAmount?: number;

  @IsOptional()
  @IsString()
  feeCurrency?: string;
}

// PATCH /scheduling/doctor-availability body is a bare JSON array (the
// frontend's RecurringWeeklySchedule shape) -- validated element-by-element
// via ParseArrayPipe({ items: WorkingHoursDayRequestDto }) in the controller,
// not wrapped in an object. Always exactly 7 entries; that invariant is a
// real domain rule re-checked in UpdateDoctorWorkingHoursUseCase, not just a
// transport-layer concern, so it's not re-asserted here.
export class WorkingHoursDayRequestDto {
  @IsIn(ALL_WEEK_DAYS)
  dayOfWeek!: string;

  @IsBoolean()
  isWorkingDay!: boolean;

  @ValidateNested()
  @Type(() => TimeRangeRequestDto)
  hours!: TimeRangeRequestDto;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TimeRangeRequestDto)
  breaks!: TimeRangeRequestDto[];

  @IsOptional()
  @ValidateNested()
  @Type(() => PricingRequestDto)
  pricing?: PricingRequestDto;
}
