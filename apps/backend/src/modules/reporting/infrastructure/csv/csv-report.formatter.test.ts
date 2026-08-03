import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { paymentsToCsvRows, toCsvString } from './csv-report.formatter.js';

describe('csv-report.formatter', () => {
  it('returns an empty string for zero rows', () => {
    assert.equal(toCsvString([]), '');
  });

  it('renders a header row from the first row keys and one line per row', () => {
    const csv = toCsvString([
      { metric: 'revenue', value: 100 },
      { metric: 'transactions', value: 3 },
    ]);
    assert.equal(csv, 'metric,value\nrevenue,100\ntransactions,3');
  });

  it('quote-wraps and escapes a cell containing a comma or embedded quote', () => {
    const csv = toCsvString([{ name: 'Doe, John "Doc"', value: 1 }]);
    assert.equal(csv, 'name,value\n"Doe, John ""Doc""",1');
  });

  it('maps PaymentAnalyticsResult to metric/value rows including nulls as empty strings', () => {
    const rows = paymentsToCsvRows({
      revenue: 100,
      revenueGrowthPercent: null,
      transactions: 2,
      successfulPayments: 2,
      failedPayments: 0,
      refunds: 0,
      averageConsultationPrice: null,
    });
    const priceRow = rows.find((row) => row.metric === 'averageConsultationPrice');
    assert.equal(priceRow?.value, '');
  });
});
