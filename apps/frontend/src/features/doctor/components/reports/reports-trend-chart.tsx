'use client';

import { TrendingUp } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { DoctorReportsAnalyticsBucketPoint } from '@/features/doctor/api/types';
import { AreaChart } from '@/shared/ui/charts/area-chart';
import { EmptyState } from '@/shared/ui/empty-state';

export interface ReportsTrendChartProps {
  data: DoctorReportsAnalyticsBucketPoint[];
}

/**
 * Doctor Reports page rebuild (Phase 3): the appointment-volume trend below
 * the tile grid -- structurally copies `appointment-analytics-panel.tsx`'s
 * own trend-chart block (empty-state pattern, `AreaChart` usage), fed by
 * `byBucket` instead of the admin panel's platform-wide series.
 * `next/dynamic`-loaded with `ssr: false` from `reports-summary.tsx`
 * (Recharts needs a real DOM), same mechanism `admin/analytics/page.tsx`
 * uses for every one of its own chart-bearing panels.
 */
export function ReportsTrendChart({ data }: ReportsTrendChartProps) {
  const t = useTranslations('doctor.reports.trend');

  if (data.length === 0) {
    return <EmptyState icon={TrendingUp} title={t('emptyTitle')} description={t('emptyDescription')} />;
  }

  const trend = data.map((point) => ({
    date: new Date(point.bucket).toLocaleDateString(undefined, { timeZone: 'Africa/Cairo' }),
    count: point.count,
  }));

  return <AreaChart data={trend} xKey="date" series={[{ key: 'count', label: t('seriesLabel') }]} />;
}
