'use client';

import dynamic from 'next/dynamic';
import { ArrowRight, CalendarCheck, CheckCircle2, Clock, Hourglass, Star, UserX, XCircle } from 'lucide-react';
import { useFormatter, useTranslations } from 'next-intl';
import { useSearchParams } from 'next/navigation';
import { useState, type ReactNode } from 'react';
import { Heading } from '@/design-system/typography';
import { ExportReportsButton } from '@/features/doctor/components/reports/export-reports-button';
import { PeriodDeltaBadge } from '@/features/doctor/components/reports/period-delta-badge';
import { getLast30DaysRange, ReportsDateRangePicker } from '@/features/doctor/components/reports/reports-date-range-picker';
import { useDoctorReportsAnalytics } from '@/features/doctor/hooks/use-doctor-reports-analytics';
import { Link, usePathname, useRouter } from '@/shared/i18n/navigation';
import { Icon } from '@/shared/icons/icon';
import { Alert } from '@/shared/ui/alert';
import { ChartSkeleton } from '@/shared/ui/charts/chart-skeleton';
import { Checkbox } from '@/shared/ui/checkbox';
import { ChartContainer } from '@/shared/ui/layout/chart-container';
import { DashboardGrid } from '@/shared/ui/layout/page';
import { LinkableStatCard } from '@/shared/ui/layout/linkable-stat-card';

// Each panel below the tile grid renders a Recharts bundle -- next/dynamic +
// ssr:false keeps that bundle out of server rendering entirely (Recharts
// needs a real DOM), the exact mechanism `admin/analytics/page.tsx` uses for
// every one of its own chart panels.
const ReportsTrendChart = dynamic(
  () => import('@/features/doctor/components/reports/reports-trend-chart').then((mod) => mod.ReportsTrendChart),
  { ssr: false, loading: () => <ChartSkeleton height={260} /> },
);

/** A tile wrapped with an optional "vs previous period" badge in its corner -- keeps `PeriodDeltaBadge` fully outside `LinkableStatCard`, so that shared primitive stays untouched. */
function TileWithDelta({ children, badge }: { children: ReactNode; badge?: ReactNode }) {
  return (
    <div className="relative">
      {children}
      {badge && <div className="absolute end-3 top-3">{badge}</div>}
    </div>
  );
}

/**
 * The Doctor Workspace's "Reports" page -- Doctor Reports page rebuild
 * (Phase 3): real, date-ranged, reconciled 7-tile appointment-status counts
 * + rating + trend, replacing the old lifetime-only 4-tile
 * `reports-summary` endpoint/hook (kept in place, unused, per plan
 * decision 9 -- `use-doctor-reports-summary.ts` has no more callers after
 * this).
 *
 * `?dateFrom=&dateTo=&comparePrevious=` URL state mirrors this codebase's
 * established `?tab=`/`?thread=` precedent (`doctor/queue/page.tsx`,
 * `messaging-workspace.tsx`): state is seeded once from the URL on mount,
 * every change writes back via `router.replace` (never `push`, so adjusting
 * the date range doesn't spam browser history). When the URL has none of
 * these params, the default is resolved client-side to last-30-days
 * (`getLast30DaysRange`, matching `DoctorReportFilterQueryDto`'s own
 * no-params default) so the date-range picker always shows concrete values,
 * never a blank input.
 *
 * The page's dynamic "selected range" subtitle lives here rather than being
 * prop-drilled up to `WorkspaceHeader` on the page component -- that header
 * is a static server-rendered shell with no knowledge of this component's
 * date state, and threading one string up through the page for a single
 * consumer would be more machinery than the string is worth.
 */
export function ReportsSummary() {
  const t = useTranslations('doctor.reports');
  const format = useFormatter();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const defaultRange = getLast30DaysRange();
  const [dateFrom, setDateFrom] = useState(() => searchParams.get('dateFrom') || defaultRange.dateFrom);
  const [dateTo, setDateTo] = useState(() => searchParams.get('dateTo') || defaultRange.dateTo);
  const [comparePrevious, setComparePrevious] = useState(() => searchParams.get('comparePrevious') === 'true');

  function writeParams(next: { dateFrom: string; dateTo: string; comparePrevious: boolean }) {
    const params = new URLSearchParams(searchParams.toString());
    params.set('dateFrom', next.dateFrom);
    params.set('dateTo', next.dateTo);
    if (next.comparePrevious) {
      params.set('comparePrevious', 'true');
    } else {
      params.delete('comparePrevious');
    }
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }

  function handleDateRangeChange(nextFrom: string, nextTo: string) {
    setDateFrom(nextFrom);
    setDateTo(nextTo);
    writeParams({ dateFrom: nextFrom, dateTo: nextTo, comparePrevious });
  }

  function handleCompareChange(checked: boolean) {
    setComparePrevious(checked);
    writeParams({ dateFrom, dateTo, comparePrevious: checked });
  }

  const { data, isLoading, isError } = useDoctorReportsAnalytics({ dateFrom, dateTo, comparePrevious });

  if (isError) {
    return <Alert variant="danger">{t('loadError')}</Alert>;
  }

  const rangeLabel = `${format.dateTime(new Date(dateFrom), { month: 'short', day: 'numeric', year: 'numeric' })} – ${format.dateTime(
    new Date(dateTo),
    { month: 'short', day: 'numeric', year: 'numeric' },
  )}`;

  const showDelta = comparePrevious && Boolean(data?.previousPeriod);

  // Rating tile: below the 5-review threshold, an honest "not enough data"
  // message replaces the bare average -- the API still returns the real
  // average/count (never nulled out server-side), this is purely a
  // frontend presentation decision (plan decision 5).
  const ratingValue =
    data?.averageRating == null
      ? t('stats.noReviewsYet')
      : data.reviewCount < 5
        ? t('stats.notEnoughRatings', { count: data.reviewCount })
        : t('stats.ratingValue', { rating: data.averageRating.toFixed(1) });
  const ratingHelperText =
    data?.averageRating != null && data.reviewCount >= 5 ? t('stats.ratingCount', { count: data.reviewCount }) : undefined;

  // Tile icon-tint mapping (Doctor Reports page rebuild, plan decision 6) --
  // documented here rather than left implicit in the tiles below:
  //   Total -> primary, Completed -> success, Pending approval -> warning,
  //   Upcoming -> info, Cancelled -> danger, No-show -> secondary (this
  //   token set has no second distinct "problem" red -- flagged, not
  //   invented), Rating -> neutral.
  //
  // Drill-down hrefs: Schedule's own page (`doctor/schedule/page.tsx`) reads
  // `?status=` from the URL today (Phase 2) but does NOT read `?from=`/`?to=`
  // -- its date range comes entirely from local `weekOffset` state, not the
  // URL. So every href below carries only `?status=`, never the plan's
  // originally-guessed `?from=&to=&status=` (verified against the real page,
  // not assumed). Pending approval links to `status=requested`, which is
  // broader than this tile's own free-only definition (Schedule has no
  // free/paid filter) -- an honest approximation, not an exact match.
  // Upcoming spans Confirmed + Rescheduled + a paid-but-unpaid Requested, so
  // it links to Schedule with no status filter at all rather than picking
  // one of its three underlying statuses arbitrarily.

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <ReportsDateRangePicker dateFrom={dateFrom} dateTo={dateTo} onChange={handleDateRangeChange} />
        <ExportReportsButton filter={{ dateFrom, dateTo, comparePrevious }} />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Checkbox
            id="reports-compare-previous"
            checked={comparePrevious}
            onCheckedChange={(checked) => handleCompareChange(checked === true)}
          />
          <label htmlFor="reports-compare-previous" className="text-sm text-text-secondary">
            {t('comparePreviousLabel')}
          </label>
        </div>
        <p className="text-sm text-text-tertiary">{t('rangeSubtitle', { range: rangeLabel })}</p>
      </div>

      <Heading as="h2" level={3}>
        {t('tilesHeading')}
      </Heading>

      <DashboardGrid columns={4}>
        <TileWithDelta
          badge={
            showDelta && data ? (
              <PeriodDeltaBadge current={data.totalAppointments} previous={data.previousPeriod?.totalAppointments} direction="higher-is-better" />
            ) : undefined
          }
        >
          <LinkableStatCard
            icon={CalendarCheck}
            iconClassName="bg-primary-subtle text-primary-emphasis"
            label={t('stats.totalAppointments')}
            value={String(data?.totalAppointments ?? 0)}
            helperText={data ? t('stats.expiredFootnote', { count: data.expired }) : undefined}
            loading={isLoading}
          />
        </TileWithDelta>

        <TileWithDelta
          badge={
            showDelta && data ? (
              <PeriodDeltaBadge current={data.completed} previous={data.previousPeriod?.completed} direction="higher-is-better" />
            ) : undefined
          }
        >
          <LinkableStatCard
            icon={CheckCircle2}
            iconClassName="bg-success-subtle text-success-emphasis"
            label={t('stats.completed')}
            value={String(data?.completed ?? 0)}
            href="/doctor/schedule?status=completed"
            loading={isLoading}
          />
        </TileWithDelta>

        <LinkableStatCard
          icon={Hourglass}
          iconClassName="bg-warning-subtle text-warning-emphasis"
          label={t('stats.pendingApproval')}
          value={String(data?.pendingApproval ?? 0)}
          href="/doctor/schedule?status=requested"
          loading={isLoading}
        />

        <LinkableStatCard
          icon={Clock}
          iconClassName="bg-info-subtle text-info-emphasis"
          label={t('stats.upcoming')}
          value={String(data?.upcoming ?? 0)}
          href="/doctor/schedule"
          loading={isLoading}
        />

        <TileWithDelta
          badge={
            showDelta && data ? (
              <PeriodDeltaBadge current={data.cancelled} previous={data.previousPeriod?.cancelled} direction="lower-is-better" />
            ) : undefined
          }
        >
          <LinkableStatCard
            icon={XCircle}
            iconClassName="bg-danger-subtle text-danger-emphasis"
            label={t('stats.cancelled')}
            value={String(data?.cancelled ?? 0)}
            href="/doctor/schedule?status=cancelled"
            loading={isLoading}
          />
        </TileWithDelta>

        <LinkableStatCard
          icon={UserX}
          iconClassName="bg-secondary-subtle text-text-secondary"
          label={t('stats.noShow')}
          value={String(data?.noShow ?? 0)}
          href="/doctor/schedule?status=no_show"
          loading={isLoading}
        />

        <LinkableStatCard
          icon={Star}
          iconClassName="bg-neutral-subtle text-text-secondary"
          label={t('stats.averageRating')}
          value={ratingValue}
          helperText={ratingHelperText}
          loading={isLoading}
        />
      </DashboardGrid>

      <ChartContainer title={t('trendTitle')}>
        {isLoading ? <ChartSkeleton height={260} /> : <ReportsTrendChart data={data?.byBucket ?? []} />}
      </ChartContainer>

      <Link href="/doctor/earnings" className="flex items-center gap-1 text-sm font-medium text-primary hover:underline">
        {t('seeEarnings')}
        <Icon icon={ArrowRight} size="sm" flipRtl />
      </Link>
    </div>
  );
}
