'use client';

import { ArrowRight, Banknote, ChevronDown, Info, PiggyBank, Wallet } from 'lucide-react';
import { useFormatter, useTranslations } from 'next-intl';
import { useSearchParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import { useState } from 'react';
import { formatCurrency } from '@/shared/lib/currency/format-currency';
import { useDoctorEarningsSummary } from '@/features/payment/hooks/use-doctor-earnings-summary';
import { useDoctorEarningsTransactions } from '@/features/payment/hooks/use-doctor-earnings-transactions';
import {
  EarningsDateRangePicker,
  getLast30DaysRange,
} from '@/features/payment/components/earnings-date-range-picker';
import { ExportEarningsButton } from '@/features/payment/components/export-earnings-button';
import { Link, usePathname, useRouter } from '@/shared/i18n/navigation';
import { Icon } from '@/shared/icons/icon';
import { Alert } from '@/shared/ui/alert';
import { StatusBadge } from '@/shared/ui/status-badge';
import { MetricStat, MetricStrip } from '@/shared/ui/metric-stat';
import { ChartSkeleton } from '@/shared/ui/charts/chart-skeleton';
import { EmptyState } from '@/shared/ui/empty-state';
import { Skeleton } from '@/shared/ui/skeleton';

// Recharts needs a real DOM, so the chart loads client-side only (same as Reports).
const BarChart = dynamic(() => import('@/shared/ui/charts/bar-chart').then((mod) => mod.BarChart), {
  ssr: false,
  loading: () => <ChartSkeleton height={220} />,
});
import type { PaymentStatus } from '@/features/payment/api/types';

type Cycle = { cycleLabel: string; netAmount: number };

function monthKey(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
}

/**
 * The chart's month axis: every month of the selected range (never fewer than the last six, so one
 * month of data is never a single full-width bar), with months that had no earnings shown as real
 * zeros. An open-ended range ("All time") starts at the first month with data instead of years of
 * empty bars. Values are the backend's own per-cycle figures; nothing is computed here but the axis.
 */
function chartMonths(cycles: Cycle[], dateFrom: string, dateTo: string): Cycle[] {
  const byMonth = new Map(cycles.map((cycle) => [cycle.cycleLabel, cycle]));
  const end = new Date(`${dateTo.slice(0, 7)}-01T00:00:00Z`);
  const sixBack = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth() - 5, 1));
  const rangeStart = new Date(`${dateFrom.slice(0, 7)}-01T00:00:00Z`);
  const firstData =
    cycles.length > 0 ? new Date(`${[...byMonth.keys()].sort()[0]}-01T00:00:00Z`) : end;
  let start = rangeStart > firstData ? rangeStart : firstData;
  if (start > sixBack) start = sixBack;
  const months: Cycle[] = [];
  for (
    let cursor = start;
    cursor <= end;
    cursor = new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth() + 1, 1))
  ) {
    const key = monthKey(cursor);
    months.push(byMonth.get(key) ?? { cycleLabel: key, netAmount: 0 });
  }
  return months;
}

/**
 * I2 -- Doctor earnings dashboard (docs/01-prd.md L15 "earnings dashboard",
 * L94 §2.10, L189 "commission taken transparently and disclosed to doctors
 * upfront"). Real numbers derived from the existing PaymentTransaction
 * ledger (`GET /payments/doctor/earnings-summary`) -- no separate payout/
 * invoice model, so this never claims a bank transfer happened, only what
 * was earned and the platform's disclosed commission rate.
 *
 * Doctor Earnings page rebuild (Phase 3): `?dateFrom=&dateTo=` URL state
 * mirrors `ReportsSummary`'s exact pattern -- state seeded once from the URL
 * on mount, defaulting to last-30-days (`getLast30DaysRange`) when absent,
 * every change writing back via `router.replace` (never `push`, so
 * adjusting the range doesn't spam browser history).
 */
export function DoctorEarningsSummary() {
  const t = useTranslations('doctor.earnings');
  const format = useFormatter();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const defaultRange = getLast30DaysRange();
  const [dateFrom, setDateFrom] = useState(
    () => searchParams.get('dateFrom') || defaultRange.dateFrom,
  );
  const [dateTo, setDateTo] = useState(() => searchParams.get('dateTo') || defaultRange.dateTo);

  function handleDateRangeChange(nextFrom: string, nextTo: string) {
    setDateFrom(nextFrom);
    setDateTo(nextTo);
    const params = new URLSearchParams(searchParams.toString());
    params.set('dateFrom', nextFrom);
    params.set('dateTo', nextTo);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }

  // Plan decision 7: a single `useDoctorEarningsSummary({dateFrom, dateTo})`
  // call feeds BOTH the always-lifetime tiles below AND the range-scoped
  // cycles table further down -- the backend guarantees `lifetime*` fields
  // in the response are always computed across the doctor's full,
  // unfiltered ledger regardless of what `dateFrom`/`dateTo` were sent
  // (Phase 0 fix for the bug where a `?month=` filter used to silently
  // collapse "lifetime" totals to that one month). Do NOT split this into a
  // second, unfiltered call -- the lifetime tiles' displayed values must
  // never change as the date range picker moves; see the regression test in
  // doctor-earnings-summary.test.tsx.
  const { data, isLoading, isError } = useDoctorEarningsSummary({ dateFrom, dateTo });
  const {
    data: transactions,
    isLoading: transactionsLoading,
    isError: transactionsError,
  } = useDoctorEarningsTransactions({
    dateFrom,
    dateTo,
  });

  if (isError) {
    return <Alert variant="danger">{t('loadError')}</Alert>;
  }

  const currency = data?.currency ?? 'EGP';
  // Phase 8: routed through the shared `formatCurrency` helper (used
  // identically by `pay-now-form.tsx` and `features/scheduling/utils/
  // pricing.ts`) instead of a local `format.number(...)` call, so every
  // money value in the app is guaranteed to format the same way.
  const formatMoney = (amount: number) => formatCurrency(format, amount, currency);

  // `cycleLabel` is a plain "YYYY-MM" string from the backend -- parse the
  // parts directly (rather than `new Date(cycleLabel)`, which is prone to
  // timezone-shifting the parsed date a day either way) and format via UTC
  // so the displayed month/year can never drift with the viewer's timezone.
  function formatCycleLabel(cycleLabel: string, monthStyle: 'long' | 'short' = 'long'): string {
    const [year, month] = cycleLabel.split('-').map(Number);
    const cycleDate = new Date(Date.UTC(year, month - 1, 1));
    return format.dateTime(cycleDate, {
      month: monthStyle,
      year: monthStyle === 'long' ? 'numeric' : '2-digit',
      timeZone: 'UTC',
    });
  }

  function formatTransactionDate(createdAt: string): string {
    return format.dateTime(new Date(createdAt), {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      timeZone: 'UTC',
    });
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Doctor Reports page rebuild (Phase 3): the reverse of Reports' own
          "see your earnings" cross-link -- same `Link` + `ArrowRight` idiom
          the Schedule page already established for its own cross-page link. */}
      <Link
        href="/doctor/reports"
        className="flex items-center gap-1 self-end text-sm font-medium text-primary hover:underline"
      >
        {t('seeReports')}
        <Icon icon={ArrowRight} size="sm" flipRtl />
      </Link>

      {/* Order: the range toolbar, then the hero figure, then the chart that follows the range. */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <EarningsDateRangePicker
          dateFrom={dateFrom}
          dateTo={dateTo}
          onChange={handleDateRangeChange}
        />
        <ExportEarningsButton filter={{ dateFrom, dateTo }} />
      </div>

      {/* Net earnings lead (hero); the monthly net chart sits beside it; the disclaimers are ONE short note under the chart. Lifetime tiles are NOT scoped to the date range, and each says so. */}
      <div className="grid gap-(--card-gap) @wide:grid-cols-3">
        <MetricStat
          variant="hero"
          icon={Wallet}
          label={t('stats.lifetimeNet')}
          value={data ? formatMoney(data.lifetimeNetAmount) : '—'}
          helperText={t('stats.lifetimeHelper')}
          loading={isLoading}
        />
        <div className="flex min-w-0 flex-col gap-3 rounded-(--r-card) border border-border-default bg-surface p-(--card-pad) shadow-xs @wide:col-span-2">
          <h2 className="text-h3 text-text-primary">{t('cyclesTitle')}</h2>
          {isLoading ? (
            <ChartSkeleton height={220} />
          ) : !data || data.cycles.length === 0 ? (
            <EmptyState
              size="sm"
              illustration="records-start"
              title={t('cyclesEmptyTitle')}
              description={t('cyclesEmptyDescription')}
            />
          ) : (
            <BarChart
              height={220}
              xKey="month"
              series={[{ key: 'net', label: t('table.net') }]}
              formatValue={formatMoney}
              data={chartMonths(data.cycles, dateFrom, dateTo).map((cycle) => ({
                month: formatCycleLabel(cycle.cycleLabel, 'short'),
                net: cycle.netAmount,
              }))}
            />
          )}
          <details className="group text-small text-text-secondary">
            <summary className="flex cursor-pointer list-none items-start gap-2 rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring [&::-webkit-details-marker]:hidden">
              <Icon icon={Info} size="sm" className="mt-0.5 shrink-0 text-care-text" />
              <span className="line-clamp-2">
                {data
                  ? t('chartNote', { rate: Math.round(data.commissionRate * 100) })
                  : t('chartNoteNoRate')}{' '}
                <span className="font-semibold text-care-text group-open:hidden">
                  {t('learnMore')}
                </span>
              </span>
            </summary>
            <div className="mt-2 flex flex-col gap-1 ps-6">
              <p>{t('payoutHonesty')}</p>
              <p>{t('taxFootnote')}</p>
              <p>{t('recognitionBasis')}</p>
            </div>
          </details>
        </div>
      </div>

      <MetricStrip>
        <MetricStat
          variant="inline"
          icon={Banknote}
          label={t('stats.lifetimeGross')}
          value={data ? formatMoney(data.lifetimeGrossAmount) : '—'}
          helperText={t('stats.lifetimeHelper')}
          loading={isLoading}
        />
        <MetricStat
          variant="inline"
          icon={PiggyBank}
          label={t('stats.transactionCount')}
          value={String(data?.lifetimeTransactionCount ?? 0)}
          helperText={t('stats.lifetimeHelper')}
          loading={isLoading}
        />
      </MetricStrip>

      {/* The month-by-month figures behind the chart, collapsed by default (the chart already says it). */}
      {!isLoading && data && data.cycles.length > 0 && (
        <details className="group flex flex-col gap-3">
          <summary className="flex cursor-pointer list-none items-baseline gap-2 rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring [&::-webkit-details-marker]:hidden">
            <Icon
              icon={ChevronDown}
              size="sm"
              className="self-center text-text-tertiary transition-transform duration-(--duration-fast) group-open:rotate-180"
            />
            <span className="text-sm font-medium text-text-primary">{t('detailsToggle')}</span>
            {/* Cycles are range-scoped; this qualifier keeps that explicit next to the always-lifetime tiles. */}
            <span className="text-xs text-text-tertiary">{t('cyclesPeriodQualifier')}</span>
          </summary>
          {
            <div className="mt-3 overflow-x-auto rounded-(--r-card) border border-border-default">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border-default text-start text-xs text-text-tertiary">
                    <th className="px-4 py-2 text-start font-medium">{t('table.cycle')}</th>
                    <th className="px-4 py-2 text-start font-medium">{t('table.gross')}</th>
                    <th className="px-4 py-2 text-start font-medium">{t('table.commission')}</th>
                    <th className="px-4 py-2 text-start font-medium">{t('table.net')}</th>
                    <th className="px-4 py-2 text-start font-medium">{t('table.transactions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {data.cycles.map((cycle) => (
                    <tr
                      key={cycle.cycleLabel}
                      className="border-b border-border-default last:border-0"
                    >
                      <td className="px-4 py-2 font-medium text-text-primary">
                        {formatCycleLabel(cycle.cycleLabel)}
                      </td>
                      <td className="px-4 py-2 tabular-nums text-text-secondary">
                        {formatMoney(cycle.grossAmount)}
                      </td>
                      <td className="px-4 py-2 tabular-nums text-text-secondary">
                        {formatMoney(cycle.commissionAmount)}
                      </td>
                      <td className="px-4 py-2 tabular-nums font-medium text-text-primary">
                        {formatMoney(cycle.netAmount)}
                      </td>
                      <td className="px-4 py-2 tabular-nums text-text-secondary">
                        {cycle.transactionCount}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          }
        </details>
      )}

      {/*
       * Drill-down table (Doctor Earnings page rebuild, Phase 3, plan
       * decision 6): scoped to the selected date range, not paginated --
       * consistent with the doctor-scale (not admin-scale) assumption
       * already used for Reports' own list controls. Refund transparency
       * (plan decision 3): a Refunded row is visible here, badged, but its
       * fee is never summed into anything on this page -- all totals above
       * come from the summary endpoint's own server-computed figures, not a
       * client-side reduction over this table.
       */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <h2 className="text-sm font-medium text-text-primary">{t('transactionsTitle')}</h2>
          {/*
           * Phase 9 [VERIFY] earnings-attribution finding: read
           * InitiateChargeUseCase (apps/backend/src/modules/payment/
           * application/use-cases/initiate-charge/initiate-charge.use-case.ts)
           * and PrismaPaymentTransactionRepository.findByDoctorId -- a
           * transaction is created and marked Succeeded the moment the
           * charge authorizes (right as the appointment goes
           * Requested -> Confirmed), never revisited when the appointment
           * later completes, is marked no-show, or sits stuck Confirmed.
           * `createdAt` (= charge time, not consultation time) is also what
           * this section's date-range filter matches against. Both facts
           * are disclosed here honestly instead of implying "recorded when
           * the consultation happened."
           */}
        </div>
        {transactionsError ? (
          <Alert variant="danger">{t('transactionsLoadError')}</Alert>
        ) : transactionsLoading ? (
          <Skeleton className="h-32 w-full" />
        ) : !transactions || transactions.length === 0 ? (
          <EmptyState
            illustration="records-start"
            title={t('transactionsEmptyTitle')}
            description={t('transactionsEmptyDescription')}
          />
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-border-default">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border-default text-start text-xs text-text-tertiary">
                  <th className="px-4 py-2 text-start font-medium">{t('table.patient')}</th>
                  <th className="px-4 py-2 text-start font-medium">{t('table.date')}</th>
                  <th className="px-4 py-2 text-start font-medium">{t('table.fee')}</th>
                  <th className="px-4 py-2 text-start font-medium">{t('table.status')}</th>
                  <th className="px-4 py-2 text-start font-medium">
                    <span className="sr-only">{t('table.appointment')}</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((transaction) => (
                  <tr key={transaction.id} className="border-b border-border-default last:border-0">
                    <td className="px-4 py-2 font-medium text-text-primary">
                      {transaction.patientName}
                    </td>
                    <td className="px-4 py-2 text-text-secondary">
                      {formatTransactionDate(transaction.createdAt)}
                    </td>
                    <td className="px-4 py-2 tabular-nums text-text-secondary">
                      {format.number(transaction.amount.amount, {
                        style: 'currency',
                        currency: transaction.amount.currency,
                      })}
                    </td>
                    <td className="px-4 py-2">
                      <StatusBadge
                        status={transaction.status}
                        label={t(`status.${transaction.status}`)}
                      />
                    </td>
                    <td className="px-4 py-2 text-end">
                      {/*
                       * Phase 9: every DoctorEarningsTransaction already
                       * carries appointmentId (DoctorEarningsTransactionResponseDto)
                       * -- no new fetch needed. Deep-links to the Phase 2
                       * Appointments view using its existing `?highlight=`
                       * convention (features/doctor/components/appointments/
                       * appointments-workspace.tsx) so a doctor can check a
                       * transaction against what actually happened on that
                       * appointment.
                       */}
                      <Link
                        href={`/doctor/appointments?highlight=${transaction.appointmentId}`}
                        className="text-xs font-medium text-primary hover:underline"
                      >
                        {t('viewAppointment')}
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
