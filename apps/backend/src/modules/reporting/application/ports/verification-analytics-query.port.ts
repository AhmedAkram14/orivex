import type { ReportFilter } from '../dto/report-filter.js';

export interface VerificationAnalyticsResult {
  pending: number;
  approved: number;
  rejected: number;
  suspended: number;
  averageReviewTimeHours: number | null;
  doctorCases: number;
  patientCases: number;
}

export interface VerificationAnalyticsQueryPort {
  getAnalytics(filter: ReportFilter): Promise<VerificationAnalyticsResult>;
}
