'use client';

import { ArrowRight, Banknote, PiggyBank, Wallet } from 'lucide-react';
import { useFormatter, useTranslations } from 'next-intl';
import { useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { formatCurrency } from '@/shared/lib/currency/format-currency';
import { useDoctorEarningsSummary } from '@/features/payment/hooks/use-doctor-earnings-summary';
import { useDoctorEarningsTransactions } from '@/features/payment/hooks/use-doctor-earnings-transactions';
import { EarningsDateRangePicker, getLast30DaysRange } from '@/features/payment/components/earnings-date-range-picker';
import { ExportEarningsButton } from '@/features/payment/components/export-earnings-button';
import { Link, usePathname, useRouter } from '@/shared/i18n/navigation';
import { Icon } from '@/shared/icons/icon';
import { Alert } from '@/shared/ui/alert';
import { Badge, badgeVariants } from '@/shared/ui/badge';
import { DashboardGrid } from '@/shared/ui/layout/page';
import { LinkableStatCard } from '@/shared/ui/layout/linkable-stat-card';
import { EmptyState } from '@/shared/ui/empty-state';
import { Skeleton } from '@/shared/ui/skeleton';
import type { PaymentStatus } from '@/features/payment/api/types';
import type { VariantProps } from 'class-variance-authority';

type BadgeVariant = NonNullable<VariantProps<typeof badgeVariants>['variant']>;

// Same positive/neutral/negative badge convention as `AdminPaymentsTable`'s
// own `STATUS_BADGE_VARIANT` -- `refunded` gets a visibly distinct, negative
// treatment (`danger`) here rather than that table's neutral one: on this
// doctor-facing drill-down a refund is money the doctor no longer has,
// which reads as a "problem/reversed" state worth flagging, not a plain
// resolved-and-inactive one.
const STATUS_BADGE_VARIANT: Record<PaymentStatus, BadgeVariant> = {
  succeeded: 'success',
  settled: 'success',
  refunded: 'danger',
  initiated: 'warning',
  failed: 'danger',
  disputed: 'danger',
};

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
  const [dateFrom, setDateFrom] = useState(() => searchParams.get('dateFrom') || defaultRange.dateFrom);
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
  const { data: transactions, isLoading: transactionsLoading, isError: transactionsError } = useDoctorEarningsTransactions({
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
  function formatCycleLabel(cycleLabel: string): string {
    const [year, month] = cycleLabel.split('-').map(Number);
    const cycleDate = new Date(Date.UTC(year, month - 1, 1));
    return format.dateTime(cycleDate, { month: 'long', year: 'numeric', timeZone: 'UTC' });
  }

  function formatTransactionDate(createdAt: string): string {
    return format.dateTime(new Date(createdAt), { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Doctor Reports page rebuild (Phase 3): the reverse of Reports' own
          "see your earnings" cross-link -- same `Link` + `ArrowRight` idiom
          the Schedule page already established for its own cross-page link. */}
      <Link href="/doctor/reports" className="flex items-center gap-1 self-end text-sm font-medium text-primary hover:underline">
        {t('seeReports')}
        <Icon icon={ArrowRight} size="sm" flipRtl />
      </Link>

      {/*
       * Commission rate is a fixed platform constant, not a per-doctor
       * metric -- it doesn't belong in a KPI row next to real money figures,
       * especially since the table's own Commission column already shows it
       * in currency terms. Moved to a footnote under the table instead.
       */}
      <DashboardGrid columns={3}>
        {/*
         * Phase 9 [VERIFY]: the audit found these easy to misread as
         * scoped to the date-range picker below (they aren't -- see the
         * `hasRange` branch in GetDoctorEarningsSummaryUseCase, which
         * always sums the doctor's full, unfiltered ledger for these three
         * fields regardless of dateFrom/dateTo). `helperText` now says so
         * explicitly on every tile instead of relying on the page layout
         * alone to imply it.
         */}
        <LinkableStatCard
          icon={Wallet}
          iconClassName="bg-success-subtle text-success-emphasis"
          label={t('stats.lifetimeNet')}
          value={data ? formatMoney(data.lifetimeNetAmount) : '—'}
          helperText={t('stats.lifetimeHelper')}
          loading={isLoading}
        />
        <LinkableStatCard
          icon={Banknote}
          iconClassName="bg-primary-subtle text-primary-emphasis"
          label={t('stats.lifetimeGross')}
          value={data ? formatMoney(data.lifetimeGrossAmount) : '—'}
          helperText={t('stats.lifetimeHelper')}
          loading={isLoading}
        />
        <LinkableStatCard
          icon={PiggyBank}
          iconClassName="bg-info-subtle text-info-emphasis"
          label={t('stats.transactionCount')}
          value={String(data?.lifetimeTransactionCount ?? 0)}
          helperText={t('stats.lifetimeHelper')}
          loading={isLoading}
        />
      </DashboardGrid>

      {/*
       * Payout honesty (Doctor Earnings page rebuild, plan decision 5): no
       * payout/invoice infrastructure exists anywhere in this codebase, so
       * this deliberately states only what these figures ARE (recorded
       * earnings) and are NOT (confirmation of a transfer) -- no invented
       * payout-schedule language.
       */}
      <p className="text-xs text-text-tertiary">{t('payoutHonesty')}</p>

      <div className="flex flex-wrap items-end justify-between gap-4">
        <EarningsDateRangePicker dateFrom={dateFrom} dateTo={dateTo} onChange={handleDateRangeChange} />
        <ExportEarningsButton filter={{ dateFrom, dateTo }} />
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex items-baseline gap-2">
          <h2 className="text-sm font-medium text-text-primary">{t('cyclesTitle')}</h2>
          {/* Cycles are range-scoped (Phase 0 fix); this qualifier keeps
              that explicit next to the always-lifetime tiles above. */}
          <span className="text-xs text-text-tertiary">{t('cyclesPeriodQualifier')}</span>
        </div>
        {isLoading ? (
          <Skeleton className="h-32 w-full" />
        ) : !data || data.cycles.length === 0 ? (
          <EmptyState title={t('cyclesEmptyTitle')} description={t('cyclesEmptyDescription')} />
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-border-default">
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
                  <tr key={cycle.cycleLabel} className="border-b border-border-default last:border-0">
                    <td className="px-4 py-2 font-medium text-text-primary">{formatCycleLabel(cycle.cycleLabel)}</td>
                    <td className="px-4 py-2 tabular-nums text-text-secondary">{formatMoney(cycle.grossAmount)}</td>
                    <td className="px-4 py-2 tabular-nums text-text-secondary">{formatMoney(cycle.commissionAmount)}</td>
                    <td className="px-4 py-2 tabular-nums font-medium text-text-primary">{formatMoney(cycle.netAmount)}</td>
                    <td className="px-4 py-2 tabular-nums text-text-secondary">{cycle.transactionCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {data && (
          <p className="text-xs text-text-tertiary">
            {t('commissionFootnote', { rate: Math.round(data.commissionRate * 100) })} {t('taxFootnote')}
          </p>
        )}
      </div>

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
          <p className="text-xs text-text-tertiary">{t('recognitionBasis')}</p>
        </div>
        {transactionsError ? (
          <Alert variant="danger">{t('transactionsLoadError')}</Alert>
        ) : transactionsLoading ? (
          <Skeleton className="h-32 w-full" />
        ) : !transactions || transactions.length === 0 ? (
          <EmptyState title={t('transactionsEmptyTitle')} description={t('transactionsEmptyDescription')} />
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
                    <td className="px-4 py-2 font-medium text-text-primary">{transaction.patientName}</td>
                    <td className="px-4 py-2 text-text-secondary">{formatTransactionDate(transaction.createdAt)}</td>
                    <td className="px-4 py-2 tabular-nums text-text-secondary">
                      {format.number(transaction.amount.amount, { style: 'currency', currency: transaction.amount.currency })}
                    </td>
                    <td className="px-4 py-2">
                      <Badge variant={STATUS_BADGE_VARIANT[transaction.status]}>{t(`status.${transaction.status}`)}</Badge>
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
