'use client';

import { Banknote, PiggyBank, Receipt, Wallet } from 'lucide-react';
import { useFormatter, useTranslations } from 'next-intl';
import { useDoctorEarningsSummary } from '@/features/payment/hooks/use-doctor-earnings-summary';
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
  const formatMoney = (amount: number) => format.number(amount, { style: 'currency', currency, currencyDisplay: 'code' });

  return (
    <div className="flex flex-col gap-6">
      <DashboardGrid columns={4}>
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
          icon={Receipt}
          iconClassName="bg-warning-subtle text-warning-emphasis"
          label={t('stats.commissionRate')}
          value={data ? t('stats.commissionRateValue', { rate: Math.round(data.commissionRate * 100) }) : '—'}
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
                    <td className="px-4 py-2 font-medium text-text-primary">{cycle.cycleLabel}</td>
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
      </div>
    </div>
  );
}
