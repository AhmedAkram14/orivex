'use client';

import { Info } from 'lucide-react';
import { useFormatter, useTranslations } from 'next-intl';
import type { DoctorEarningsSummary } from '@/features/payment/api/types';
import { changePercent, summaryTotals } from '@/features/payment/lib/earnings';
import { Icon } from '@/shared/icons/icon';
import { formatCurrency } from '@/shared/lib/currency/format-currency';
import { Card } from '@/shared/ui/card';
import { MetricStat, type MetricDelta } from '@/shared/ui/metric-stat';
import { Popover, PopoverContent, PopoverTrigger } from '@/shared/ui/popover';
import { Skeleton } from '@/shared/ui/skeleton';

export interface EarningsSummaryCardProps {
  summary: DoctorEarningsSummary | undefined;
  /** The equal-length period before, for the comparison; `undefined` while loading or when there is none. */
  previous: DoctorEarningsSummary | undefined;
  /** Whether a previous period applies at all ("All time" has none). */
  comparable: boolean;
  rangeDays: number;
  loading: boolean;
}

/**
 * The page's one summary card, all scoped to the selected range: net (the hero, against the previous equal-length
 * period), gross, the platform commission with its rate, and paid consultations; under them one bar showing where
 * the gross went (net and commission), and one quiet line with the disclaimers and lifetime net.
 */
export function EarningsSummaryCard({
  summary,
  previous,
  comparable,
  rangeDays,
  loading,
}: EarningsSummaryCardProps) {
  const t = useTranslations('doctor.earnings.summary');
  const tEarnings = useTranslations('doctor.earnings');
  const format = useFormatter();
  const currency = summary?.currency ?? previous?.currency ?? 'EGP';
  const money = (amount: number) => formatCurrency(format, amount, currency);
  const totals = summary ? summaryTotals(summary) : undefined;
  const previousNet = previous ? summaryTotals(previous).net : undefined;
  const rate = summary ? Math.round(summary.commissionRate * 100) : null;

  const change = comparable && totals ? changePercent(totals.net, previousNet) : null;
  const delta: MetricDelta | undefined =
    !totals || !comparable
      ? undefined
      : change === null
        ? { label: '—', direction: 'flat', tone: 'neutral' }
        : {
            label: `${change > 0 ? '+' : ''}${format.number(change / 100, { style: 'percent' })}`,
            direction: change > 0 ? 'up' : change < 0 ? 'down' : 'flat',
            tone: change > 0 ? 'success' : change < 0 ? 'danger' : 'neutral',
          };

  const netShare = totals && totals.gross > 0 ? (totals.net / totals.gross) * 100 : 0;

  return (
    <Card data-earnings-summary="" className="flex flex-col">
      {/* Four segments: hairlines between them, stacked on a phone. */}
      <div className="@container">
        <div className="grid grid-cols-2 gap-px overflow-hidden rounded-t-(--r-card) bg-border-default *:min-w-0 *:bg-surface @2xl:grid-cols-[1.5fr_repeat(3,minmax(0,1fr))]">
          <MetricStat
            variant="inline"
            size="xl"
            className="col-span-2 @2xl:col-span-1"
            label={t('net')}
            value={totals ? money(totals.net) : '—'}
            delta={delta}
            helperText={
              comparable ? t('vsPrevious', { days: rangeDays }) : t('allTimeNoComparison')
            }
            loading={loading}
          />
          <MetricStat
            variant="inline"
            label={t('gross')}
            value={totals ? money(totals.gross) : '—'}
            loading={loading}
          />
          <MetricStat
            variant="inline"
            label={t('commission')}
            value={totals ? money(totals.commission) : '—'}
            helperText={rate !== null ? t('commissionRate', { rate }) : undefined}
            loading={loading}
          />
          <MetricStat
            variant="inline"
            label={t('paidConsultations')}
            value={totals ? format.number(totals.count) : '—'}
            loading={loading}
            className="col-span-2 @2xl:col-span-1"
          />
        </div>
      </div>

      <div className="flex flex-col gap-3 border-t border-border-default px-(--card-pad) py-4">
        {/* Where the gross went: net (ink) and the platform commission (muted, hatched), in one line. */}
        {loading ? (
          <Skeleton className="h-3 w-full rounded-full" />
        ) : totals && totals.gross > 0 ? (
          <div className="flex flex-col gap-1.5">
            <div
              role="img"
              aria-label={t('whereItWentLabel', {
                gross: money(totals.gross),
                net: money(totals.net),
                commission: money(totals.commission),
              })}
              data-where-it-went=""
              className="flex h-3 w-full overflow-hidden rounded-full"
            >
              <span
                data-segment="net"
                className="h-full bg-text-primary"
                style={{ width: `${netShare}%` }}
              />
              <span
                data-segment="commission"
                className="h-full flex-1 bg-text-primary/50 bg-[repeating-linear-gradient(135deg,transparent_0_3px,var(--color-surface)_3px_4.5px)]"
              />
            </div>
            <div className="flex items-center justify-between gap-3 text-small" aria-hidden="true">
              <span className="text-text-primary">
                <span className="font-semibold">{t('net')}</span> <bdi>{money(totals.net)}</bdi>
              </span>
              <span className="text-text-secondary">
                <span className="font-semibold">{t('commission')}</span>{' '}
                <bdi>{money(totals.commission)}</bdi>
              </span>
            </div>
          </div>
        ) : null}

        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-small text-text-tertiary">
          <p className="flex flex-wrap items-center gap-x-1">
            <span>{t('caption')}</span>
            <Popover>
              <PopoverTrigger className="inline-flex items-center gap-1 rounded-sm font-semibold text-care-text hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring">
                <Icon icon={Info} size="xs" />
                {tEarnings('learnMore')}
              </PopoverTrigger>
              <PopoverContent
                align="start"
                className="flex w-80 flex-col gap-2 text-small text-text-secondary"
              >
                <p>{tEarnings('payoutHonesty')}</p>
                <p>{tEarnings('taxFootnote')}</p>
                <p>{tEarnings('recognitionBasis')}</p>
              </PopoverContent>
            </Popover>
          </p>
          {summary && (
            <p data-lifetime-net="">
              {t('lifetimeNet')}{' '}
              <bdi className="tabular-nums">{money(summary.lifetimeNetAmount)}</bdi>
            </p>
          )}
        </div>
      </div>
    </Card>
  );
}
