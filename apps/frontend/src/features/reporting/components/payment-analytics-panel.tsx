'use client';

import { TrendingDown, TrendingUp, Wallet } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { usePaymentAnalytics } from '@/features/reporting/hooks/use-payment-analytics';
import { ExportButton } from '@/features/reporting/components/export-button';
import type { ReportFilterParams } from '@/features/reporting/api/types';
import { Alert } from '@/shared/ui/alert';
import { DashboardGrid } from '@/shared/ui/layout/page';
import { LinkableStatCard } from '@/shared/ui/layout/linkable-stat-card';

export function PaymentAnalyticsPanel({ filter, refetchIntervalMs }: { filter: ReportFilterParams; refetchIntervalMs: number | false }) {
  const t = useTranslations('admin.analytics.payments');
  const { data, isLoading, isError } = usePaymentAnalytics(filter, refetchIntervalMs);

  if (isError) return <Alert variant="danger">{t('loadError')}</Alert>;

  const growth = data?.revenueGrowthPercent;
  const growthLabel = growth == null ? t('notAvailable') : `${growth >= 0 ? '+' : ''}${growth.toFixed(1)}%`;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-text-primary">{t('title')}</h2>
        <ExportButton section="payments" filter={filter} />
      </div>
      <DashboardGrid columns={4}>
        <LinkableStatCard icon={Wallet} label={t('revenue')} value={(data?.revenue ?? 0).toLocaleString(undefined, { maximumFractionDigits: 2 })} loading={isLoading} />
        <LinkableStatCard
          icon={growth != null && growth < 0 ? TrendingDown : TrendingUp}
          label={t('revenueGrowth')}
          value={growthLabel}
          helperText={filter.comparePrevious ? t('comparePreviousPeriod') : undefined}
          loading={isLoading}
        />
        <LinkableStatCard icon={Wallet} label={t('transactions')} value={String(data?.transactions ?? 0)} loading={isLoading} />
        <LinkableStatCard icon={Wallet} label={t('averagePrice')} value={data?.averageConsultationPrice == null ? t('notAvailable') : data.averageConsultationPrice.toFixed(2)} loading={isLoading} />
        <LinkableStatCard icon={Wallet} label={t('successful')} value={String(data?.successfulPayments ?? 0)} loading={isLoading} />
        <LinkableStatCard icon={Wallet} label={t('failed')} value={String(data?.failedPayments ?? 0)} loading={isLoading} />
        <LinkableStatCard icon={Wallet} label={t('refunds')} value={String(data?.refunds ?? 0)} loading={isLoading} />
      </DashboardGrid>
    </div>
  );
}
