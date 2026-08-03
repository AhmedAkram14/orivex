import type { AppointmentAnalyticsResult } from '../../application/ports/appointment-analytics-query.port.js';

export class AppointmentAnalyticsResponseDto {
  totalCount!: number;
  completedCount!: number;
  cancelledCount!: number;
  noShowCount!: number;
  upcomingCount!: number;
  completionRate!: number;
  cancellationRate!: number;
  noShowRate!: number;
  byBucket!: Array<{ bucket: string; count: number }>;
  peakHours!: Array<{ hour: number; count: number }>;
  peakDays!: Array<{ dayOfWeek: number; count: number }>;
  typeDistribution!: { free: number; paid: number };

  static fromResult(result: AppointmentAnalyticsResult): AppointmentAnalyticsResponseDto {
    return Object.assign(new AppointmentAnalyticsResponseDto(), result);
  }
}
