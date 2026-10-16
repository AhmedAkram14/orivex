import type { ReportFilter } from '../dto/report-filter.js';

export interface VerificationAnalyticsResult {
  pending: number;
  approved: number;
  /** Distinct doctors with an approved professional verification -- the dashboard's "Verified doctors" (approved counts every subject type, patients included). */
  approvedDoctors: number;
  rejected: number;
  suspended: number;
  averageReviewTimeHours: number | null;
  doctorCases: number;
  patientCases: number;
}

export interface VerificationAnalyticsQueryPort {
  getAnalytics(filter: ReportFilter): Promise<VerificationAnalyticsResult>;
}
