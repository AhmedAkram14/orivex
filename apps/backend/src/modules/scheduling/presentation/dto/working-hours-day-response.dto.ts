import type { WorkingHoursDay } from '../../domain/entities/working-hours-day.entity.js';

class TimeRangeResponseDto {
  start!: string;
  end!: string;
}

class PricingResponseDto {
  pricingType!: string;
  feeAmount!: number | null;
  feeCurrency!: string | null;
}

// Matches the frontend's real WorkingHoursDay contract exactly
// (features/scheduling/types.ts).
export class WorkingHoursDayResponseDto {
  dayOfWeek!: string;
  isWorkingDay!: boolean;
  hours!: TimeRangeResponseDto;
  breaks!: TimeRangeResponseDto[];
  pricing!: PricingResponseDto;

  static fromDomain(day: WorkingHoursDay): WorkingHoursDayResponseDto {
    const dto = new WorkingHoursDayResponseDto();
    dto.dayOfWeek = day.getDayOfWeek();
    dto.isWorkingDay = day.getIsWorkingDay();
    dto.hours = day.getHours();
    dto.breaks = day.getBreaks();
    const fee = day.getPricing().getFee();
    dto.pricing = {
      pricingType: day.getPricing().getPricingType(),
      feeAmount: fee?.getAmount() ?? null,
      feeCurrency: fee?.getCurrency() ?? null,
    };
    return dto;
  }
}
