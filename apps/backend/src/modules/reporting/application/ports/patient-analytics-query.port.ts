import type { DateWindow } from '../dto/previous-period.js';
import type { ReportFilter } from '../dto/report-filter.js';

export interface PatientAnalyticsResult {
  newPatients: number;
  returningPatients: number;
  verifiedPatients: number;
  // "Active" = took part in at least one COMPLETED appointment within the
  // filter window (the trailing 30 days when no range is given) -- the same
  // definition as DoctorAnalyticsQueryPort.countActiveDoctors. Account
  // carries no separate active/inactive flag, so real visits are the only
  // non-fabricated signal; a cancelled or missed booking is not activity.
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
  /** Distinct patients with a COMPLETED appointment scheduled in the window -- what `activePatients` reports. */
  countActivePatients(window: DateWindow): Promise<number>;
}
