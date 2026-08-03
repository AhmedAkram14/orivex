import type { ReportFilter } from '../../dto/report-filter.js';
import type { VerificationAnalyticsQueryPort, VerificationAnalyticsResult } from '../../ports/verification-analytics-query.port.js';

export class GetVerificationAnalyticsUseCase {
  constructor(private readonly verificationAnalyticsQuery: VerificationAnalyticsQueryPort) {}

  execute(filter: ReportFilter): Promise<VerificationAnalyticsResult> {
    return this.verificationAnalyticsQuery.getAnalytics(filter);
  }
}
