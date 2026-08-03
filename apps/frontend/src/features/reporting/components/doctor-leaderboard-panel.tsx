'use client';

import { useState } from 'react';
import { Stethoscope } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Link } from '@/shared/i18n/navigation';
import { useDoctorAnalytics } from '@/features/reporting/hooks/use-doctor-analytics';
import { ExportButton } from '@/features/reporting/components/export-button';
import type { DoctorSortBy, ReportFilterParams } from '@/features/reporting/api/types';
import { Alert } from '@/shared/ui/alert';
import { EmptyState } from '@/shared/ui/empty-state';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select';
import { Skeleton } from '@/shared/ui/skeleton';
import { WidgetContainer } from '@/shared/ui/layout/widget-container';

const SORT_OPTIONS: DoctorSortBy[] = ['revenue', 'rating', 'completedConsultations', 'patientCount'];

/**
 * Top Doctors / Top Rated / Top Revenue are all this same table with a
 * different `sortBy` -- one implementation, not one leaderboard per metric
 * (per the "reusable leaderboards, don't duplicate tables" requirement).
 * Each row links to the existing Users table (`/admin/users`), the closest
 * real admin screen for a doctor's account -- unfiltered, since that page
 * has no query-string filter to drill into yet (see DashboardKpiGrid's own
 * comment on the same constraint); no per-doctor detail page exists.
 */
export function DoctorLeaderboardPanel({ filter, refetchIntervalMs }: { filter: ReportFilterParams; refetchIntervalMs: number | false }) {
  const t = useTranslations('admin.analytics.doctors');
  const [sortBy, setSortBy] = useState<DoctorSortBy>('revenue');
  const { data, isLoading, isError } = useDoctorAnalytics({ ...filter, sortBy, limit: 10 }, refetchIntervalMs);

  if (isError) return <Alert variant="danger">{t('loadError')}</Alert>;

  return (
    <WidgetContainer
      title={t('title')}
      actions={
        <div className="flex items-center gap-2">
          <Select value={sortBy} onValueChange={(value) => setSortBy(value as DoctorSortBy)}>
            <SelectTrigger aria-label={t('sortBy')} className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SORT_OPTIONS.map((option) => (
                <SelectItem key={option} value={option}>
                  {t(`sort.${option}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <ExportButton section="doctors" filter={filter} />
        </div>
      }
    >
      {isLoading ? (
        <div className="flex flex-col gap-2" aria-busy="true">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      ) : data && data.entries.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border-default text-left text-xs text-text-tertiary">
                <th scope="col" className="py-2 pe-4">{t('columnDoctor')}</th>
                <th scope="col" className="py-2 pe-4">{t('columnCompleted')}</th>
                <th scope="col" className="py-2 pe-4">{t('columnRating')}</th>
                <th scope="col" className="py-2 pe-4">{t('columnRevenue')}</th>
                <th scope="col" className="py-2 pe-4">{t('columnPatients')}</th>
              </tr>
            </thead>
            <tbody>
              {data.entries.map((entry) => (
                <tr key={entry.doctorId} className="border-b border-border-default last:border-0">
                  <td className="py-2 pe-4">
                    <Link href="/admin/users" className="font-medium text-primary hover:underline">
                      {entry.displayName}
                    </Link>
                  </td>
                  <td className="py-2 pe-4">{entry.completedConsultations}</td>
                  <td className="py-2 pe-4">{entry.averageRating == null ? '—' : `${entry.averageRating.toFixed(1)} (${entry.reviewCount})`}</td>
                  <td className="py-2 pe-4">{entry.revenueGenerated.toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                  <td className="py-2 pe-4">{entry.patientCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyState icon={Stethoscope} title={t('emptyTitle')} description={t('emptyDescription')} />
      )}
    </WidgetContainer>
  );
}
