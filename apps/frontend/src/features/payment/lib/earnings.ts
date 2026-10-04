import type {
  DoctorEarningsSummary,
  DoctorEarningsTransaction,
  PaymentStatus,
} from '@/features/payment/api/types';

/**
 * The Earnings page's arithmetic, in one place -- the same rules the backend uses, never a second opinion:
 * `GetDoctorEarningsSummaryUseCase` (apps/backend/src/modules/payment/application/use-cases/
 * get-doctor-earnings-summary/get-doctor-earnings-summary.use-case.ts):
 *  - only Succeeded and Settled payments are earnings;
 *  - per payment, commission = round2(gross x commissionRate) and net = round2(gross - commission);
 *  - totals add up per payment, rounding to cents at every step;
 *  - periods are UTC calendar periods of the payment's `createdAt` (its months are "YYYY-MM" in UTC).
 * The rate is the API's own `commissionRate`; nothing here hard-codes it.
 */

const EARNED_STATUSES: ReadonlySet<PaymentStatus> = new Set(['succeeded', 'settled']);
const DAY_MS = 24 * 60 * 60 * 1000;

export const round2 = (value: number) => Math.round(value * 100) / 100;

export function isEarned(transaction: Pick<DoctorEarningsTransaction, 'status'>): boolean {
  return EARNED_STATUSES.has(transaction.status);
}

export interface Amounts {
  gross: number;
  commission: number;
  net: number;
  count: number;
}

const ZERO: Amounts = { gross: 0, commission: 0, net: 0, count: 0 };

/** One payment's split; a payment that isn't an earning (refunded, failed, in progress) has none. */
export function rowAmounts(
  transaction: DoctorEarningsTransaction,
  rate: number,
): { gross: number; commission: number | null; net: number | null } {
  const gross = transaction.amount.amount;
  if (!isEarned(transaction)) return { gross, commission: null, net: null };
  const commission = round2(gross * rate);
  return { gross, commission, net: round2(gross - commission) };
}

/** Adds earned payments the way the backend does (per payment, rounded at every step). */
export function sumEarned(transactions: DoctorEarningsTransaction[], rate: number): Amounts {
  return transactions.reduce((total, transaction) => {
    if (!isEarned(transaction)) return total;
    const gross = transaction.amount.amount;
    const commission = round2(gross * rate);
    return {
      gross: round2(total.gross + gross),
      commission: round2(total.commission + commission),
      net: round2(total.net + (gross - commission)),
      count: total.count + 1,
    };
  }, ZERO);
}

/** The range's totals from the summary endpoint's own per-month figures (its `cycles` are exactly the range). */
export function summaryTotals(summary: DoctorEarningsSummary): Amounts {
  return summary.cycles.reduce(
    (total, cycle) => ({
      gross: round2(total.gross + cycle.grossAmount),
      commission: round2(total.commission + cycle.commissionAmount),
      net: round2(total.net + cycle.netAmount),
      count: total.count + cycle.transactionCount,
    }),
    ZERO,
  );
}

// ---- ranges ----

/** The page's range as the API takes it: `dateFrom` inclusive, `dateTo` exclusive, both "YYYY-MM-DD" (midnight UTC). */
export interface EarningsRange {
  dateFrom: string;
  dateTo: string;
}

const utcDay = (iso: string) => Date.parse(`${iso}T00:00:00Z`);
const isoDay = (ms: number) => new Date(ms).toISOString().slice(0, 10);

/** Whole days the range spans. */
export function rangeDays(range: EarningsRange): number {
  return Math.max(1, Math.round((utcDay(range.dateTo) - utcDay(range.dateFrom)) / DAY_MS));
}

/** The equal-length period right before (for the comparison); `null` for an open-ended range ("All time"). */
export function previousRange(range: EarningsRange, openEnded: boolean): EarningsRange | null {
  if (openEnded) return null;
  const days = rangeDays(range);
  return { dateFrom: isoDay(utcDay(range.dateFrom) - days * DAY_MS), dateTo: range.dateFrom };
}

/** Change against the previous period, in percent; `null` when there is nothing to compare with (zero before). */
export function changePercent(current: number, previous: number | null | undefined): number | null {
  if (previous == null || previous <= 0) return null;
  return Math.round(((current - previous) / previous) * 100);
}

// ---- the chart ----

export type Granularity = 'day' | 'week' | 'month';

/** Daily up to a month, weekly up to ~4 months, monthly beyond -- and for "All time". */
export function granularityFor(range: EarningsRange, openEnded: boolean): Granularity {
  if (openEnded) return 'month';
  const days = rangeDays(range);
  if (days <= 31) return 'day';
  if (days <= 120) return 'week';
  return 'month';
}

export interface Bucket extends Amounts {
  key: string;
  /** Start (inclusive) and end (exclusive) in UTC ms. */
  start: number;
  end: number;
  /** The range's most recent period -- drawn solid. */
  latest: boolean;
}

const monthStart = (ms: number) => {
  const date = new Date(ms);
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1);
};
const nextMonth = (ms: number) => {
  const date = new Date(ms);
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1);
};

/**
 * The range cut into periods, every one present (empty ones as zeros), each with the earned payments that fall in
 * it. Weeks are 7-day spans counted back from the range's end, so the last bar is always the most recent week. An
 * open-ended range starts at the first month with a payment rather than years of empty bars.
 */
export function buckets(
  transactions: DoctorEarningsTransaction[],
  rate: number,
  range: EarningsRange,
  granularity: Granularity,
  openEnded: boolean,
): Bucket[] {
  const end = utcDay(range.dateTo);
  let start = utcDay(range.dateFrom);
  const earned = transactions.filter(isEarned);
  if (openEnded) {
    const first = Math.min(
      ...earned.map((transaction) => Date.parse(transaction.createdAt)),
      end - DAY_MS,
    );
    start = Math.max(start, monthStart(first));
  }

  const spans: Array<{ start: number; end: number }> = [];
  if (granularity === 'day') {
    for (let cursor = start; cursor < end; cursor += DAY_MS)
      spans.push({ start: cursor, end: cursor + DAY_MS });
  } else if (granularity === 'week') {
    for (let cursor = end; cursor > start; cursor -= 7 * DAY_MS)
      spans.unshift({ start: Math.max(start, cursor - 7 * DAY_MS), end: cursor });
  } else {
    for (let cursor = monthStart(start); cursor < end; cursor = nextMonth(cursor)) {
      spans.push({ start: Math.max(start, cursor), end: Math.min(end, nextMonth(cursor)) });
    }
  }

  return spans.map((span, index) => {
    const inside = earned.filter((transaction) => {
      const at = Date.parse(transaction.createdAt);
      return at >= span.start && at < span.end;
    });
    return {
      key: isoDay(span.start),
      ...span,
      ...sumEarned(inside, rate),
      latest: index === spans.length - 1,
    };
  });
}

// ---- the transactions list ----

export interface MonthGroup {
  /** "YYYY-MM" (UTC), as the backend labels its cycles. */
  key: string;
  net: number;
  rows: DoctorEarningsTransaction[];
}

/** Newest month first; each with its earned net. */
export function groupByMonth(
  transactions: DoctorEarningsTransaction[],
  rate: number,
): MonthGroup[] {
  const groups = new Map<string, DoctorEarningsTransaction[]>();
  for (const transaction of transactions) {
    const key = transaction.createdAt.slice(0, 7);
    groups.set(key, [...(groups.get(key) ?? []), transaction]);
  }
  return [...groups.entries()]
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([key, rows]) => ({ key, rows, net: sumEarned(rows, rate).net }));
}
