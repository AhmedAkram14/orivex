import type { ReportFilter } from '../../dto/report-filter.js';
import type { PatientAnalyticsQueryPort, PatientAnalyticsResult } from '../../ports/patient-analytics-query.port.js';

export class GetPatientAnalyticsUseCase {
  constructor(private readonly patientAnalyticsQuery: PatientAnalyticsQueryPort) {}

  execute(filter: ReportFilter): Promise<PatientAnalyticsResult> {
    return this.patientAnalyticsQuery.getAnalytics(filter);
  }
}
