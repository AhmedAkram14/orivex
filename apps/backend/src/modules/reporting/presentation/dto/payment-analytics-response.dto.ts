import type { PaymentAnalyticsResult } from '../../application/ports/payment-analytics-query.port.js';

export class PaymentAnalyticsResponseDto {
  revenue!: number;
  revenueGrowthPercent!: number | null;
  transactions!: number;
  successfulPayments!: number;
  failedPayments!: number;
  refunds!: number;
  averageConsultationPrice!: number | null;

  static fromResult(result: PaymentAnalyticsResult): PaymentAnalyticsResponseDto {
    return Object.assign(new PaymentAnalyticsResponseDto(), result);
  }
}
