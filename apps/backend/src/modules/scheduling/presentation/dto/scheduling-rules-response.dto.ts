import type { SchedulingRules } from '../../application/use-cases/get-scheduling-rules/get-scheduling-rules.use-case.js';

// Matches the frontend's real SchedulingRules contract exactly
// (features/scheduling/types.ts).
export class SchedulingRulesResponseDto {
  slotDurationMinutes!: number;
  bufferMinutes!: number;
  minNoticeMinutes!: number;
  maxBookingWindowDays!: number;

  static fromDomain(rules: SchedulingRules): SchedulingRulesResponseDto {
    const dto = new SchedulingRulesResponseDto();
    dto.slotDurationMinutes = rules.slotDurationMinutes;
    dto.bufferMinutes = rules.bufferMinutes;
    dto.minNoticeMinutes = rules.minNoticeMinutes;
    dto.maxBookingWindowDays = rules.maxBookingWindowDays;
    return dto;
  }
}
