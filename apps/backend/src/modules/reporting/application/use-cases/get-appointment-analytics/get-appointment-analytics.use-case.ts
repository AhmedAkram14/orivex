import type { ReportFilter } from '../../dto/report-filter.js';
import type {
  AnalyticsBucket,
  AppointmentAnalyticsQueryPort,
  AppointmentAnalyticsResult,
} from '../../ports/appointment-analytics-query.port.js';

export class GetAppointmentAnalyticsUseCase {
  constructor(private readonly appointmentAnalyticsQuery: AppointmentAnalyticsQueryPort) {}

  execute(filter: ReportFilter, bucket: AnalyticsBucket): Promise<AppointmentAnalyticsResult> {
    return this.appointmentAnalyticsQuery.getAnalytics(filter, bucket);
  }
}
