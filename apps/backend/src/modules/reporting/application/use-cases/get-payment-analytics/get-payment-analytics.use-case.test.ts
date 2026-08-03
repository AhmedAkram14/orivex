import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { PaymentAnalyticsQueryPort } from '../../ports/payment-analytics-query.port.js';

import { GetPaymentAnalyticsUseCase } from './get-payment-analytics.use-case.js';

describe('GetPaymentAnalyticsUseCase', () => {
  it('does not pass a previous window to the query port when comparePrevious is false', async () => {
    let capturedPrevious: unknown = 'not-called';
    const port: PaymentAnalyticsQueryPort = {
      getAnalytics: async (_filter, _current, previous) => {
        capturedPrevious = previous;
        return {
          revenue: 0,
          revenueGrowthPercent: null,
          transactions: 0,
          successfulPayments: 0,
          failedPayments: 0,
          refunds: 0,
          averageConsultationPrice: null,
        };
      },
    };
    const useCase = new GetPaymentAnalyticsUseCase(port);

    await useCase.execute({}, false);

    assert.equal(capturedPrevious, undefined);
  });

  it('computes and passes a previous window of equal duration when comparePrevious is true', async () => {
    let capturedPrevious: { from: Date; to: Date } | undefined;
    const port: PaymentAnalyticsQueryPort = {
      getAnalytics: async (_filter, _current, previous) => {
        capturedPrevious = previous;
        return {
          revenue: 0,
          revenueGrowthPercent: null,
          transactions: 0,
          successfulPayments: 0,
          failedPayments: 0,
          refunds: 0,
          averageConsultationPrice: null,
        };
      },
    };
    const useCase = new GetPaymentAnalyticsUseCase(port);
    const dateFrom = new Date('2026-01-08T00:00:00Z');
    const dateTo = new Date('2026-01-15T00:00:00Z');

    await useCase.execute({ dateFrom, dateTo }, true);

    assert.ok(capturedPrevious);
    assert.equal(capturedPrevious!.to.toISOString(), dateFrom.toISOString());
  });
});
