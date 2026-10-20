'use client';

import { useState } from 'react';

import { useFormatter, useTranslations } from 'next-intl';
import { formatCurrency } from '@/shared/lib/currency/format-currency';
import { Link } from '@/shared/i18n/navigation';
import { useDoctorAnalytics } from '@/features/reporting/hooks/use-doctor-analytics';
import { ExportButton } from '@/features/reporting/components/export-button';
import type { DoctorSortBy, ReportFilterParams } from '@/features/reporting/api/types';
import { Alert } from '@/shared/ui/alert';
import { EmptyState } from '@/shared/ui/empty-state';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select';
import { Skeleton } from '@/shared/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/ui/table';
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
  const format = useFormatter();
  const [sortBy, setSortBy] = useState<DoctorSortBy>('revenue');
  const { data, isLoading, isError } = useDoctorAnalytics({ ...filter, sortBy, limit: 10 }, refetchIntervalMs);

  if (isError) return <Alert variant="danger">{t('loadError')}</Alert>;

  return (
    <WidgetContainer
      title={t('title')}
      actions={
        <div className="flex items-center gap-2">
          <Select value={sortBy} onValueChange={(value) => setSortBy(value as DoctorSortBy)}>
            <SelectTrigger aria-label={t('sortBy')} className="w-44">
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
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('columnDoctor')}</TableHead>
              <TableHead className="text-end">{t('columnCompleted')}</TableHead>
              <TableHead className="text-end">{t('columnRating')}</TableHead>
              <TableHead className="text-end">{t('columnRevenue')}</TableHead>
              <TableHead className="text-end">{t('columnPatients')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.entries.map((entry) => (
              <TableRow key={entry.doctorId}>
                {/* One line per name: a narrow card scrolls the table sideways rather than stacking a name 3 lines tall. */}
                <TableCell className="whitespace-nowrap">
                  <Link href="/admin/users" dir="auto" className="font-medium text-primary hover:underline">
                    {entry.displayName}
                  </Link>
                </TableCell>
                <TableCell className="text-end tabular-nums">{format.number(entry.completedConsultations)}</TableCell>
                <TableCell className="whitespace-nowrap text-end tabular-nums">
                  {entry.averageRating == null ? '—' : `${format.number(entry.averageRating, { minimumFractionDigits: 1, maximumFractionDigits: 1 })} (${format.number(entry.reviewCount)})`}
                </TableCell>
                <TableCell className="whitespace-nowrap text-end tabular-nums">{formatCurrency(format, entry.revenueGenerated, 'EGP')}</TableCell>
                <TableCell className="text-end tabular-nums">{format.number(entry.patientCount)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : (
        <EmptyState illustration="records-start" title={t('emptyTitle')} description={t('emptyDescription')} />
      )}
    </WidgetContainer>
  );
}
