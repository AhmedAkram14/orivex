import type { VerificationAnalyticsResult } from '../../application/ports/verification-analytics-query.port.js';

export class VerificationAnalyticsResponseDto {
  pending!: number;
  approved!: number;
  rejected!: number;
  suspended!: number;
  averageReviewTimeHours!: number | null;
  doctorCases!: number;
  patientCases!: number;

  static fromResult(result: VerificationAnalyticsResult): VerificationAnalyticsResponseDto {
    return Object.assign(new VerificationAnalyticsResponseDto(), result);
  }
}
