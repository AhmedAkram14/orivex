import type { ReportFilter } from '../../dto/report-filter.js';
import { resolveCurrentWindow, resolvePreviousWindow } from '../../dto/previous-period.js';
import type { PaymentAnalyticsQueryPort, PaymentAnalyticsResult } from '../../ports/payment-analytics-query.port.js';

export class GetPaymentAnalyticsUseCase {
  constructor(private readonly paymentAnalyticsQuery: PaymentAnalyticsQueryPort) {}

  execute(filter: ReportFilter, comparePrevious: boolean): Promise<PaymentAnalyticsResult> {
    const current = resolveCurrentWindow(filter.dateFrom, filter.dateTo);
    const previous = comparePrevious ? resolvePreviousWindow(current) : undefined;
    return this.paymentAnalyticsQuery.getAnalytics(filter, current, previous);
  }
}
