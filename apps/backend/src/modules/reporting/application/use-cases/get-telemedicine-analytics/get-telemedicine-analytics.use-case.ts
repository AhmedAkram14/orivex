import type { ReportFilter } from '../../dto/report-filter.js';
import type { TelemedicineAnalyticsQueryPort, TelemedicineAnalyticsResult } from '../../ports/telemedicine-analytics-query.port.js';

export class GetTelemedicineAnalyticsUseCase {
  constructor(private readonly telemedicineAnalyticsQuery: TelemedicineAnalyticsQueryPort) {}

  execute(filter: ReportFilter): Promise<TelemedicineAnalyticsResult> {
    return this.telemedicineAnalyticsQuery.getAnalytics(filter);
  }
}
