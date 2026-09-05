import type { LucideIcon } from 'lucide-react';
import { Icon } from '@/shared/icons/icon';
import { EmptyState } from '@/shared/ui/empty-state';
import { TrendChart, type TrendChartTone } from '@/shared/ui/health/trend-chart';
import { WidgetContainer } from '@/shared/ui/layout/widget-container';
import { cn } from '@/shared/lib/cn';

export interface VitalTrendCardProps {
  icon: LucideIcon;
  title: string;
  /** Icon circle background/foreground classes (e.g. "bg-info-subtle text-info-emphasis") — an accent unique to this vital, reused for the trend line via `tone`. */
  accentClassName?: string;
  /** The trend line's color, matching `accentClassName`. Defaults to the existing single-color line. */
  tone?: TrendChartTone;
  /** Pre-formatted, localized latest-value text (e.g. "72 kg") — undefined when nothing is on record. */
  latestValueLabel?: string;
  /** Pre-formatted, localized "as of" date text — undefined when nothing is on record. */
  latestDateLabel?: string;
  /** Raw numeric readings, oldest to newest, for `TrendChart`. */
  trendValues: number[];
  trendLabel: string;
  emptyTitle: string;
  emptyDescription: string;
  loading?: boolean;
}

/**
 * A single vital sign's trend card — latest reading, "as of" date, and a
 * `TrendChart` sparkline over recent history. Reusable across Weight/Blood
 * Pressure/Blood Sugar (milestone 6; Health Dashboard Redesign 2026-09-05
 * restyled it into large-value cards with a per-vital accent color), an
 * honest empty state when no readings exist yet.
 */
export function VitalTrendCard({
  icon,
  title,
  accentClassName = 'bg-primary-subtle text-primary-emphasis',
  tone = 'primary',
  latestValueLabel,
  latestDateLabel,
  trendValues,
  trendLabel,
  emptyTitle,
  emptyDescription,
  loading = false,
}: VitalTrendCardProps) {
  return (
    <WidgetContainer
      title={title}
      actions={
        <span className={cn('flex size-9 shrink-0 items-center justify-center rounded-full', accentClassName)}>
          <Icon icon={icon} size="sm" />
        </span>
      }
      loading={loading}
      contentClassName="flex flex-col justify-center"
    >
      {latestValueLabel ? (
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <p className="text-3xl font-semibold tracking-tight text-text-primary">{latestValueLabel}</p>
            {latestDateLabel && <p className="text-xs text-text-tertiary">{latestDateLabel}</p>}
          </div>
          <TrendChart values={trendValues} label={trendLabel} tone={tone} />
        </div>
      ) : (
        <EmptyState icon={icon} title={emptyTitle} description={emptyDescription} className="py-6" />
      )}
    </WidgetContainer>
  );
}
