import { toCsvString } from '../../../../reporting/infrastructure/csv/csv-report.formatter.js';
import { doctorReportsToCsvRows } from '../../../infrastructure/csv/doctor-report-csv.formatter.js';
import type {
  GetDoctorReportsAnalyticsQuery,
  GetDoctorReportsAnalyticsUseCase,
} from '../get-doctor-reports-analytics/get-doctor-reports-analytics.use-case.js';

// Doctor Reports page rebuild (Phase 2): CSV export for the same date-ranged
// analytics `GetDoctorReportsAnalyticsUseCase` already computes -- no
// separate query path, no re-aggregation. Two `toCsvString` sections
// (tiles, then trend), blank-line separated, since the two row shapes don't
// share one header (see doctor-report-csv.formatter.ts's own comment).
export class ExportDoctorReportsCsvUseCase {
  constructor(private readonly getDoctorReportsAnalyticsUseCase: GetDoctorReportsAnalyticsUseCase) {}

  async execute(query: GetDoctorReportsAnalyticsQuery): Promise<string> {
    const analytics = await this.getDoctorReportsAnalyticsUseCase.execute(query);
    const { tiles, trend } = doctorReportsToCsvRows(analytics);

    const sections = [toCsvString(tiles)];
    if (trend.length > 0) {
      sections.push(toCsvString(trend));
    }
    return sections.join('\n\n');
  }
}
