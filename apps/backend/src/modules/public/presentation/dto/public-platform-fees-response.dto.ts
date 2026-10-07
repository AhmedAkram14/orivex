import type { PlatformFeeSchedule } from '../../../payment/application/use-cases/get-platform-fee-schedule/get-platform-fee-schedule.use-case.js';

export class PublicPlatformFeesResponseDto {
  /** 0-1, e.g. 0.15 for 15% of each consultation fee. */
  commissionRate!: number;

  static fromSchedule(schedule: PlatformFeeSchedule): PublicPlatformFeesResponseDto {
    const dto = new PublicPlatformFeesResponseDto();
    dto.commissionRate = schedule.commissionRate;
    return dto;
  }
}
