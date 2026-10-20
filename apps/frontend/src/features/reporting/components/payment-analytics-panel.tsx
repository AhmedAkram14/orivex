'use client';

import { TrendingDown, TrendingUp, Wallet } from 'lucide-react';
import { useFormatter, useTranslations } from 'next-intl';
import { Heading } from '@/design-system/typography';
import { formatCurrency } from '@/shared/lib/currency/format-currency';
import { usePaymentAnalytics } from '@/features/reporting/hooks/use-payment-analytics';
import { ExportButton } from '@/features/reporting/components/export-button';
import type { ReportFilterParams } from '@/features/reporting/api/types';
import { Link } from '@/shared/i18n/navigation';
import { Alert } from '@/shared/ui/alert';
import { Button } from '@/shared/ui/button';
import { MetricGrid, MetricStat } from '@/shared/ui/metric-stat';

export function PaymentAnalyticsPanel({ filter, refetchIntervalMs }: { filter: ReportFilterParams; refetchIntervalMs: number | false }) {
  const t = useTranslations('admin.analytics.payments');
  const format = useFormatter();
  const { data, isLoading, isError } = usePaymentAnalytics(filter, refetchIntervalMs);
  // Payments are taken in EGP only (Egypt V1).
  const money = (amount: number) => formatCurrency(format, amount, 'EGP');

  if (isError) return <Alert variant="danger">{t('loadError')}</Alert>;

  const growth = data?.revenueGrowthPercent;
  const growthLabel = growth == null ? '—' : `${growth >= 0 ? '+' : ''}${format.number(growth / 100, { style: 'percent', maximumFractionDigits: 1 })}`;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Heading as="h2" level={4}>{t('title')}</Heading>
        <div className="flex flex-wrap items-center gap-2">
          {/* The transactions table (with refunds) lives on its own page, not repeated here. */}
          <Button asChild variant="secondary" size="sm">
            <Link href="/admin/payments">{t('viewTransactions')}</Link>
          </Button>
          <ExportButton section="payments" filter={filter} />
        </div>
      </div>
      <MetricGrid columns={4} minColumns={2}>
        <MetricStat icon={Wallet} label={t('revenue')} value={money(data?.revenue ?? 0)} loading={isLoading} />
        {/* Growth exists only against a comparison period, so the tile appears only when "Compare" is on. */}
        {filter.comparePrevious && (
          <MetricStat
            icon={growth != null && growth < 0 ? TrendingDown : TrendingUp}
            label={t('revenueGrowth')}
            value={growthLabel}
            helperText={growth == null ? t('noPreviousRevenue') : t('comparePreviousPeriod')}
            loading={isLoading}
          />
        )}
        <MetricStat icon={Wallet} label={t('transactions')} value={format.number(data?.transactions ?? 0)} loading={isLoading} />
        <MetricStat icon={Wallet} label={t('averagePrice')} value={data?.averageConsultationPrice == null ? '—' : money(data.averageConsultationPrice)} helperText={data?.averageConsultationPrice == null ? t('notAvailable') : undefined} loading={isLoading} />
        <MetricStat icon={Wallet} label={t('successful')} value={format.number(data?.successfulPayments ?? 0)} loading={isLoading} />
        <MetricStat icon={Wallet} label={t('failed')} value={format.number(data?.failedPayments ?? 0)} loading={isLoading} />
        <MetricStat icon={Wallet} label={t('refunds')} value={format.number(data?.refunds ?? 0)} loading={isLoading} />
      </MetricGrid>
    </div>
  );
}
