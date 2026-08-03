import type { ReportFilter } from '../dto/report-filter.js';

export interface PatientAnalyticsResult {
  newPatients: number;
  returningPatients: number;
  verifiedPatients: number;
  // "Active" = has at least one appointment within the filter window --
  // Account carries no separate active/inactive flag AccountRepository
  // exposes (findAll has no status filter), so this is the only real,
  // non-fabricated definition of "active" this data model supports.
  activePatients: number;
  // "unknown" is always present and rendered like any other segment --
  // Account.gender/dateOfBirth are optional, and sparsity is surfaced, not
  // hidden.
  genderDistribution: Record<string, number>;
  ageDistribution: Array<{ bucket: string; count: number }>;
  mostActivePatients: Array<{ patientId: string; displayName: string; appointmentCount: number }>;
}

export interface PatientAnalyticsQueryPort {
  getAnalytics(filter: ReportFilter): Promise<PatientAnalyticsResult>;
}
