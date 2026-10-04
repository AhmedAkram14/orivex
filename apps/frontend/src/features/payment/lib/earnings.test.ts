import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { LEGACY_DOCTOR_ACCOUNT_ID } from '@/mocks/auth-store';
import {
  getDoctorEarningsSummaryForMock,
  getDoctorEarningsTransactionsMock,
} from '@/mocks/earnings-store';
import {
  buckets,
  changePercent,
  granularityFor,
  groupByMonth,
  previousRange,
  rangeDays,
  round2,
  rowAmounts,
  sumEarned,
  summaryTotals,
  type EarningsRange,
} from './earnings';

// The mock ledger is laid out around "now"; pin it so the fixture is the same on every run.
const NOW = new Date('2026-10-03T12:00:00Z');
beforeAll(() => vi.useFakeTimers({ toFake: ['Date'], now: NOW }));
afterAll(() => vi.useRealTimers());

// The picker's presets for that day (end date exclusive, as the API takes it).
const PRESETS: Array<{
  name: string;
  range: EarningsRange;
  openEnded: boolean;
  granularity: string;
}> = [
  {
    name: '7 days',
    range: { dateFrom: '2026-09-26', dateTo: '2026-10-03' },
    openEnded: false,
    granularity: 'day',
  },
  {
    name: '30 days',
    range: { dateFrom: '2026-09-03', dateTo: '2026-10-03' },
    openEnded: false,
    granularity: 'day',
  },
  {
    name: '90 days',
    range: { dateFrom: '2026-07-05', dateTo: '2026-10-03' },
    openEnded: false,
    granularity: 'week',
  },
  {
    name: 'This month',
    range: { dateFrom: '2026-10-01', dateTo: '2026-10-03' },
    openEnded: false,
    granularity: 'day',
  },
  {
    name: 'All time',
    range: { dateFrom: '2020-01-01', dateTo: '2026-10-03' },
    openEnded: true,
    granularity: 'month',
  },
];

const window = (range: EarningsRange) => ({
  from: new Date(`${range.dateFrom}T00:00:00Z`),
  to: new Date(`${range.dateTo}T00:00:00Z`),
});

describe('data consistency: the summary, the rows and the chart tell one story, for every preset', () => {
  for (const preset of PRESETS) {
    it(preset.name, () => {
      // The backend's own figures (the mock is a port of the backend use cases) ...
      const summary = getDoctorEarningsSummaryForMock(
        LEGACY_DOCTOR_ACCOUNT_ID,
        window(preset.range),
      );
      const transactions = getDoctorEarningsTransactionsMock(
        LEGACY_DOCTOR_ACCOUNT_ID,
        window(preset.range),
      );
      const rate = summary.commissionRate;
      const totals = summaryTotals(summary);
      expect(totals.count, 'the fixture has earnings in this range').toBeGreaterThan(0);

      // ... the summary gross is the transactions' gross; commission is the rows' commission; net = gross - commission.
      const rows = transactions.map((transaction) => rowAmounts(transaction, rate));
      const rowGross = transactions
        .filter((_, index) => rows[index]!.net !== null)
        .reduce((sum, transaction) => round2(sum + transaction.amount.amount), 0);
      const rowCommission = rows.reduce((sum, row) => round2(sum + (row.commission ?? 0)), 0);
      const rowNet = rows.reduce((sum, row) => round2(sum + (row.net ?? 0)), 0);
      expect(rowGross).toBe(totals.gross);
      expect(rowCommission).toBe(totals.commission);
      expect(rowNet).toBe(totals.net);
      expect(round2(totals.gross - totals.commission)).toBe(totals.net);
      expect(sumEarned(transactions, rate)).toEqual(totals);

      // ... the chart's buckets add up to the same net (and count), at the range's granularity.
      const granularity = granularityFor(preset.range, preset.openEnded);
      expect(granularity).toBe(preset.granularity);
      const bars = buckets(transactions, rate, preset.range, granularity, preset.openEnded);
      expect(bars.reduce((sum, bar) => round2(sum + bar.net), 0)).toBe(totals.net);
      expect(bars.reduce((sum, bar) => sum + bar.count, 0)).toBe(totals.count);
      expect(bars.filter((bar) => bar.latest)).toHaveLength(1);
      expect(bars.at(-1)!.latest).toBe(true);

      // ... and each month group's net is the backend's own cycle for that month.
      for (const group of groupByMonth(transactions, rate)) {
        const cycle = summary.cycles.find((entry) => entry.cycleLabel === group.key);
        expect(group.net).toBe(cycle?.netAmount ?? 0);
      }
    });
  }

  it('refunded, failed and processing payments are listed but never counted', () => {
    const range = PRESETS[4]!.range;
    const transactions = getDoctorEarningsTransactionsMock(LEGACY_DOCTOR_ACCOUNT_ID, window(range));
    const notEarned = transactions.filter(
      (transaction) => !['succeeded', 'settled'].includes(transaction.status),
    );
    expect(notEarned.length).toBeGreaterThan(0);
    for (const transaction of notEarned)
      expect(rowAmounts(transaction, 0.15)).toMatchObject({ commission: null, net: null });
  });
});

describe('the bars follow the range', () => {
  const none = [] as never[];
  it('7 days: seven daily bars; 30 days: thirty; the last is the most recent day', () => {
    expect(buckets(none, 0.15, PRESETS[0]!.range, 'day', false)).toHaveLength(7);
    const thirty = buckets(none, 0.15, PRESETS[1]!.range, 'day', false);
    expect(thirty).toHaveLength(30);
    expect(thirty.at(-1)!.key).toBe('2026-10-02');
  });

  it('90 days: weekly bars counted back from the end (the first may be shorter)', () => {
    const weeks = buckets(none, 0.15, PRESETS[2]!.range, 'week', false);
    expect(weeks).toHaveLength(13);
    expect(weeks.at(-1)!.end - weeks.at(-1)!.start).toBe(7 * 24 * 60 * 60 * 1000);
  });

  it('a long custom range is monthly, a 2-month one weekly', () => {
    expect(granularityFor({ dateFrom: '2026-01-01', dateTo: '2026-10-01' }, false)).toBe('month');
    expect(granularityFor({ dateFrom: '2026-08-01', dateTo: '2026-10-01' }, false)).toBe('week');
  });
});

describe('the comparison', () => {
  it('the previous period is the same length, right before', () => {
    expect(previousRange({ dateFrom: '2026-09-03', dateTo: '2026-10-03' }, false)).toEqual({
      dateFrom: '2026-08-04',
      dateTo: '2026-09-03',
    });
    expect(rangeDays({ dateFrom: '2026-09-03', dateTo: '2026-10-03' })).toBe(30);
    expect(previousRange(PRESETS[4]!.range, true)).toBeNull();
  });

  it('a percentage only when there was something before', () => {
    expect(changePercent(1120, 1000)).toBe(12);
    expect(changePercent(900, 1000)).toBe(-10);
    expect(changePercent(500, 0)).toBeNull();
    expect(changePercent(500, undefined)).toBeNull();
  });
});
