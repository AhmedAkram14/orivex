import type { LucideIcon } from 'lucide-react';
import { Icon } from '@/shared/icons/icon';
import { EmptyState } from '@/shared/ui/empty-state';
import { TrendChart } from '@/shared/ui/health/trend-chart';
import { WidgetContainer } from '@/shared/ui/layout/widget-container';

export interface VitalTrendCardProps {
  icon: LucideIcon;
  title: string;
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
 * Pressure/Blood Sugar (milestone 6), an honest empty state when no readings
 * exist yet (no Clinical module is wired into the frontend today).
 */
export function VitalTrendCard({
  icon,
  title,
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
      actions={<Icon icon={icon} size="md" className="text-primary" />}
      loading={loading}
    >
      {latestValueLabel ? (
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-0.5">
            <p className="text-2xl font-semibold text-text-primary">{latestValueLabel}</p>
            {latestDateLabel && <p className="text-xs text-text-tertiary">{latestDateLabel}</p>}
          </div>
          <TrendChart values={trendValues} label={trendLabel} />
        </div>
      ) : (
        <EmptyState title={emptyTitle} description={emptyDescription} />
      )}
    </WidgetContainer>
  );
}
