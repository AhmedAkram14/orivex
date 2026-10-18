'use client';

import {
  Activity,
  AlertTriangle,
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  CircleAlert,
  CreditCard,
  Flag,
  type LucideIcon,
  Scale,
  ShieldCheck,
  Stethoscope,
  Users,
  Wallet,
} from 'lucide-react';
import { useFormatter, useTranslations } from 'next-intl';
import { Heading } from '@/design-system/typography';
import type { AdminOverview } from '@/features/admin/api/types';
import { useAdminOverview } from '@/features/admin/hooks/use-admin-overview';
import { buildTriageItems, waitingAge, type TriageItem, type TriageQueueKey } from '@/features/admin/lib/triage';
import { Link } from '@/shared/i18n/navigation';
import { Icon } from '@/shared/icons/icon';
import { cn } from '@/shared/lib/cn';
import { formatCurrency } from '@/shared/lib/currency/format-currency';
import { Button } from '@/shared/ui/button';
import { ErrorState } from '@/shared/ui/error-state';
import { MetricGrid, MetricStat } from '@/shared/ui/metric-stat';
import { Skeleton } from '@/shared/ui/skeleton';

const QUEUE_ICON: Record<TriageQueueKey, LucideIcon> = {
  verifications: ShieldCheck,
  disputes: Scale,
  reviews: Flag,
};

const QUEUE_LINKS: Array<{ key: TriageQueueKey; href: string }> = [
  { key: 'verifications', href: '/admin/verification-queue' },
  { key: 'disputes', href: '/admin/disputes' },
  { key: 'reviews', href: '/admin/reviews' },
];

/**
 * The admin Overview: an operational triage home. "Needs attention" lists
 * only the work queues with something in them, longest-waiting first, each
 * linking to its queue; "Platform health" is a compact strip whose every
 * figure comes from the same query Analytics uses for it. A failed load is
 * an explicit error -- never the "Nothing needs attention" empty state,
 * which would tell an admin everything is fine when nobody knows.
 */
export function AdminOverviewPanels() {
  const t = useTranslations('admin.overview');
  const { data, isLoading, isError, isRefetching, refetch } = useAdminOverview();

  if (isError) {
    return (
      <div className="flex flex-col gap-4 rounded-(--r-card) border border-border-default bg-surface p-(--card-pad)">
        <ErrorState title={t('error.title')} description={t('error.description')} onRetry={() => void refetch()} retrying={isRefetching} />
        <nav aria-label={t('attention.title')} className="flex flex-wrap justify-center gap-2 border-t border-border-default pt-4">
          {QUEUE_LINKS.map((queue) => (
            <Button key={queue.key} asChild variant="secondary" size="sm">
              <Link href={queue.href}>{t(`attention.${queue.key}`)}</Link>
            </Button>
          ))}
        </nav>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <section aria-labelledby="overview-attention" className="flex flex-col gap-4">
        <Heading as="h2" level={3}>
          <span id="overview-attention">{t('attention.title')}</span>
        </Heading>
        {isLoading || !data ? <AttentionSkeleton /> : <NeedsAttention overview={data} />}
      </section>

      <section aria-labelledby="overview-health" className="flex flex-col gap-4">
        <Heading as="h2" level={3}>
          <span id="overview-health">{t('health.title')}</span>
        </Heading>
        <PlatformHealth overview={data} loading={isLoading || !data} />
      </section>

      <Button asChild variant="link" size="sm" className="self-start">
        <Link href="/admin/audit-log">
          {t('auditLogLink')}
          <Icon icon={ArrowRight} size="xs" className="rtl:-scale-x-100" />
        </Link>
      </Button>
    </div>
  );
}

function NeedsAttention({ overview }: { overview: AdminOverview }) {
  const t = useTranslations('admin.overview.attention');
  const items = buildTriageItems(overview);

  if (items.length === 0) {
    return (
      <div className="flex items-center gap-3 rounded-(--r-card) border border-border-default bg-surface p-(--card-pad)">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-success-subtle text-success-emphasis">
          <Icon icon={CheckCircle2} size="md" />
        </span>
        <div className="flex min-w-0 flex-col gap-0.5">
          <p className="text-body font-semibold text-text-primary">{t('emptyTitle')}</p>
          <p className="text-small text-text-secondary">{t('emptyDescription')}</p>
        </div>
      </div>
    );
  }

  return (
    <ul className="grid grid-cols-1 gap-(--card-gap) sm:grid-cols-2 xl:grid-cols-3">
      {items.map((item) => (
        <li key={item.key} className="flex">
          <AttentionCard item={item} averageReviewHours={item.key === 'verifications' ? overview.averageVerificationReviewHours : null} />
        </li>
      ))}
    </ul>
  );
}

function AttentionCard({ item, averageReviewHours }: { item: TriageItem; averageReviewHours: number | null }) {
  const t = useTranslations('admin.overview.attention');
  const format = useFormatter();
  const age = item.waitingHours === null ? null : waitingAge(item.waitingHours);

  return (
    <Link
      href={item.href}
      className={cn(
        'group relative flex w-full flex-col gap-3 rounded-(--r-card) border border-border-default bg-surface p-(--card-pad) shadow-xs',
        'transition-colors duration-(--duration-fast) hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring',
        item.late && 'border-s-[3px] border-s-warning',
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="flex min-w-0 items-center gap-2 text-small font-medium text-text-secondary">
          <Icon icon={QUEUE_ICON[item.key]} size="sm" className="shrink-0 text-text-tertiary" />
          <span className="min-w-0">{t(item.key)}</span>
        </p>
        <Icon icon={ArrowRight} size="sm" className="shrink-0 text-text-tertiary transition-transform group-hover:translate-x-0.5 rtl:-scale-x-100 rtl:group-hover:-translate-x-0.5" />
      </div>
      <p data-numeric className="font-display text-metric tabular-nums text-text-primary">
        <bdi>{format.number(item.count)}</bdi>
      </p>
      <div className="mt-auto flex flex-col gap-1">
        {age ? (
          <p className={cn('flex flex-wrap items-center gap-x-2 gap-y-1 text-small', item.late ? 'text-warning-emphasis' : 'text-text-secondary')}>
            {item.late && (
              <span className="inline-flex items-center gap-1 rounded-full bg-warning-subtle px-2 py-0.5 text-caption font-semibold text-warning-emphasis">
                <Icon icon={AlertTriangle} size="xs" />
                {t('late')}
              </span>
            )}
            <span>{t(age.unit === 'hours' ? 'oldestHours' : 'oldestDays', { count: age.value })}</span>
          </p>
        ) : (
          <p className="text-small text-text-tertiary">{t('oldestUnknown')}</p>
        )}
        {averageReviewHours !== null && (
          <p className="text-caption text-text-tertiary">{t('averageReview', { hours: Math.round(averageReviewHours) })}</p>
        )}
      </div>
    </Link>
  );
}

function AttentionSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-(--card-gap) sm:grid-cols-2 xl:grid-cols-3" aria-hidden="true">
      {Array.from({ length: 3 }).map((_, index) => (
        <div key={index} className="flex flex-col gap-3 rounded-(--r-card) border border-border-default bg-surface p-(--card-pad)">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-8 w-14" />
          <Skeleton className="h-4 w-32" />
        </div>
      ))}
    </div>
  );
}

function PlatformHealth({ overview, loading }: { overview?: AdminOverview; loading: boolean }) {
  const t = useTranslations('admin.overview.health');
  const format = useFormatter();
  const health = overview?.health;
  const percent = (value: number) => format.number(value, { style: 'percent', maximumFractionDigits: 1 });
  const count = (value: number | undefined) => (value === undefined ? '' : format.number(value));

  const change = health?.revenueChangePercent ?? null;
  const days = health?.activeWindowDays ?? 30;

  return (
    <MetricGrid columns={3}>
      <MetricStat
        icon={CalendarClock}
        label={t('appointmentsToday')}
        value={count(health?.appointmentsToday)}
        helperText={health ? t('appointmentsWeek', { count: format.number(health.appointmentsLast7Days) }) : undefined}
        href="/admin/analytics#appointments"
        loading={loading}
      />
      <MetricStat
        icon={Activity}
        label={t('completionRate')}
        value={health ? percent(health.completionRate) : ''}
        helperText={health ? t('ratesHelper', { cancelled: percent(health.cancellationRate), noShow: percent(health.noShowRate) }) : undefined}
        href="/admin/analytics#appointments"
        loading={loading}
      />
      <MetricStat
        icon={Wallet}
        label={t('revenueToday')}
        value={health ? formatCurrency(format, health.revenueToday, 'EGP') : ''}
        delta={
          change === null
            ? undefined
            : {
                label: `${change > 0 ? '+' : ''}${format.number(change / 100, { style: 'percent', maximumFractionDigits: 1 })}`,
                direction: change > 0 ? 'up' : change < 0 ? 'down' : 'flat',
                tone: change > 0 ? 'success' : change < 0 ? 'danger' : 'neutral',
              }
        }
        helperText={health ? (change === null ? t('noBaseline') : t('vsLastWeek')) : undefined}
        href="/admin/analytics#payments"
        loading={loading}
      />
      <MetricStat
        icon={Stethoscope}
        label={t('activeDoctors')}
        value={count(health?.activeDoctors)}
        helperText={t('activeHelper', { days })}
        href="/admin/analytics#kpis"
        loading={loading}
      />
      <MetricStat
        icon={Users}
        label={t('activePatients')}
        value={count(health?.activePatients)}
        helperText={t('activeHelper', { days })}
        href="/admin/analytics#kpis"
        loading={loading}
      />
      {health && health.failedPayments > 0 && (
        <MetricStat
          icon={CreditCard}
          label={t('failedPayments')}
          value={count(health.failedPayments)}
          helperText={
            <span className="inline-flex items-center gap-1 text-danger-emphasis">
              <Icon icon={CircleAlert} size="xs" />
              {t('failedHelper', { days })}
            </span>
          }
          href="/admin/payments"
          loading={loading}
        />
      )}
    </MetricGrid>
  );
}
