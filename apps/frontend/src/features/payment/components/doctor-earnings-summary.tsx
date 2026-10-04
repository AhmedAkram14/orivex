'use client';

import { useFormatter, useTranslations } from 'next-intl';
import { EarningsChart } from '@/features/payment/components/earnings-chart';
import { EarningsDateRangePicker } from '@/features/payment/components/earnings-date-range-picker';
import { EarningsSummaryCard } from '@/features/payment/components/earnings-summary-card';
import { EarningsTransactions } from '@/features/payment/components/earnings-transactions';
import { useDoctorEarningsSummary } from '@/features/payment/hooks/use-doctor-earnings-summary';
import { useDoctorEarningsTransactions } from '@/features/payment/hooks/use-doctor-earnings-transactions';
import { buckets, granularityFor, previousRange, rangeDays, type EarningsRange } from '@/features/payment/lib/earnings';
import { Alert } from '@/shared/ui/alert';

export interface DoctorEarningsSummaryProps {
  range: EarningsRange;
  /** "All time": no previous period to compare with; monthly bars. */
  openEnded: boolean;
  onRangeChange: (dateFrom: string, dateTo: string) => void;
}

/**
 * I2 -- Doctor earnings (docs/01-prd.md L15, L94 §2.10, L189 "commission taken transparently and disclosed to
 * doctors upfront"). Everything below the range toolbar follows the selected range: one summary card (net against
 * the previous equal-length period, gross, the platform commission, paid consultations, where the gross went), the
 * earnings over time at the range's own granularity, and the range's transactions. The only lifetime figure is the
 * summary card's quiet "Lifetime net" line. Figures are the backend's own: the summary endpoint for the totals (and,
 * called with the previous range, for the comparison); the transactions endpoint for the rows and the bars, split
 * with the backend's commission rule (`lib/earnings.ts`). Recorded earnings, not payouts.
 */
export function DoctorEarningsSummary({ range, openEnded, onRangeChange }: DoctorEarningsSummaryProps) {
  const t = useTranslations('doctor.earnings');
  const format = useFormatter();
  const previous = previousRange(range, openEnded);

  const summary = useDoctorEarningsSummary(range);
  const previousSummary = useDoctorEarningsSummary(previous ?? undefined, { enabled: previous !== null });
  const transactions = useDoctorEarningsTransactions(range);

  if (summary.isError) return <Alert variant="danger">{t('loadError')}</Alert>;

  const rate = summary.data?.commissionRate;
  const currency = summary.data?.currency ?? transactions.data?.[0]?.amount.currency ?? 'EGP';
  const granularity = granularityFor(range, openEnded);
  const chartBuckets =
    transactions.data && rate !== undefined ? buckets(transactions.data, rate, range, granularity, openEnded) : [];
  // The range in words: its first day to its last (the API's end date is exclusive).
  const lastDay = new Date(Date.parse(`${range.dateTo}T00:00:00Z`) - 1);
  const firstDay = openEnded && chartBuckets.length > 0 ? new Date(chartBuckets[0]!.start) : new Date(`${range.dateFrom}T00:00:00Z`);
  const rangeLabel = format.dateTimeRange(firstDay, lastDay, { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });

  return (
    <div className="flex flex-col gap-(--card-gap)">
      <EarningsDateRangePicker dateFrom={range.dateFrom} dateTo={range.dateTo} onChange={onRangeChange} />

      <EarningsSummaryCard
        summary={summary.data}
        previous={previousSummary.data}
        comparable={previous !== null && !previousSummary.isError}
        rangeDays={rangeDays(range)}
        loading={summary.isLoading}
      />

      <EarningsChart
        buckets={chartBuckets}
        granularity={granularity}
        currency={currency}
        rangeLabel={rangeLabel}
        loading={summary.isLoading || transactions.isLoading}
      />

      {/* A new range starts the list from its first rows again. */}
      <EarningsTransactions
        key={`${range.dateFrom}:${range.dateTo}`}
        transactions={transactions.data}
        commissionRate={rate}
        currency={currency}
        loading={transactions.isLoading || summary.isLoading}
        error={transactions.isError}
      />
    </div>
  );
}
