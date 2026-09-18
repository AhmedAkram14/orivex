'use client';

import { ArrowRight, Banknote, PiggyBank, Wallet } from 'lucide-react';
import { useFormatter, useTranslations } from 'next-intl';
import { useDoctorEarningsSummary } from '@/features/payment/hooks/use-doctor-earnings-summary';
import { Link } from '@/shared/i18n/navigation';
import { Icon } from '@/shared/icons/icon';
import { Alert } from '@/shared/ui/alert';
import { DashboardGrid } from '@/shared/ui/layout/page';
import { LinkableStatCard } from '@/shared/ui/layout/linkable-stat-card';
import { EmptyState } from '@/shared/ui/empty-state';
import { Skeleton } from '@/shared/ui/skeleton';

/**
 * I2 -- Doctor earnings dashboard (docs/01-prd.md L15 "earnings dashboard",
 * L94 §2.10, L189 "commission taken transparently and disclosed to doctors
 * upfront"). Real numbers derived from the existing PaymentTransaction
 * ledger (`GET /payments/doctor/earnings-summary`) -- no separate payout/
 * invoice model, so this never claims a bank transfer happened, only what
 * was earned and the platform's disclosed commission rate.
 */
export function DoctorEarningsSummary() {
  const t = useTranslations('doctor.earnings');
  const format = useFormatter();
  const { data, isLoading, isError } = useDoctorEarningsSummary();

  if (isError) {
    return <Alert variant="danger">{t('loadError')}</Alert>;
  }

  const currency = data?.currency ?? 'EGP';
  // No `currencyDisplay` override -- matches the one other place this app
  // formats a currency amount (`formatConsultationPrice`, scheduling/utils/
  // pricing.ts): Intl's default 'symbol' behavior already renders "ج.م.‏"
  // for EGP under an Arabic locale and falls back to the ISO code "EGP"
  // under English (EGP has no simple Latin symbol), so both locales get the
  // locale-appropriate string for free, with no per-locale branching here.
  const formatMoney = (amount: number) => format.number(amount, { style: 'currency', currency });

  // `cycleLabel` is a plain "YYYY-MM" string from the backend -- parse the
  // parts directly (rather than `new Date(cycleLabel)`, which is prone to
  // timezone-shifting the parsed date a day either way) and format via UTC
  // so the displayed month/year can never drift with the viewer's timezone.
  function formatCycleLabel(cycleLabel: string): string {
    const [year, month] = cycleLabel.split('-').map(Number);
    const cycleDate = new Date(Date.UTC(year, month - 1, 1));
    return format.dateTime(cycleDate, { month: 'long', year: 'numeric', timeZone: 'UTC' });
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
        <LinkableStatCard
          icon={Wallet}
          iconClassName="bg-success-subtle text-success-emphasis"
          label={t('stats.lifetimeNet')}
          value={data ? formatMoney(data.lifetimeNetAmount) : '—'}
          loading={isLoading}
        />
        <LinkableStatCard
          icon={Banknote}
          iconClassName="bg-primary-subtle text-primary-emphasis"
          label={t('stats.lifetimeGross')}
          value={data ? formatMoney(data.lifetimeGrossAmount) : '—'}
          loading={isLoading}
        />
        <LinkableStatCard
          icon={PiggyBank}
          iconClassName="bg-info-subtle text-info-emphasis"
          label={t('stats.transactionCount')}
          value={String(data?.lifetimeTransactionCount ?? 0)}
          loading={isLoading}
        />
      </DashboardGrid>

      <div className="flex flex-col gap-3">
        <h2 className="text-sm font-medium text-text-primary">{t('cyclesTitle')}</h2>
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
    </div>
  );
}
