import type { TelemedicineAnalyticsResult } from '../../application/ports/telemedicine-analytics-query.port.js';

export class TelemedicineAnalyticsResponseDto {
  totalSessions!: number;
  completedSessions!: number;
  averageDurationMinutes!: number | null;

  static fromResult(result: TelemedicineAnalyticsResult): TelemedicineAnalyticsResponseDto {
    return Object.assign(new TelemedicineAnalyticsResponseDto(), result);
  }
}
