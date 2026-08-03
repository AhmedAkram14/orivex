import type { ReportFilter } from '../dto/report-filter.js';
import type { DateWindow } from '../dto/previous-period.js';

export interface PaymentAnalyticsResult {
  revenue: number;
  revenueGrowthPercent: number | null;
  transactions: number;
  successfulPayments: number;
  failedPayments: number;
  refunds: number;
  averageConsultationPrice: number | null;
}

export interface PaymentAnalyticsQueryPort {
  getAnalytics(filter: ReportFilter, currentWindow: DateWindow, previousWindow?: DateWindow): Promise<PaymentAnalyticsResult>;
}
