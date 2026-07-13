import { TrendingDown, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/shared/ui/card';
import { Icon } from '@/shared/icons/icon';
import { cn } from '@/shared/lib/cn';

export interface MetricCardProps {
  label: string;
  value: string;
  /** Signed percentage change, e.g. 12.4 or -3.1. Omit when no trend is meaningful (e.g. a first-ever reading) — never fabricate a 0 to fill the slot. */
  trend?: number;
  className?: string;
}

/** A single large KPI figure with an optional trend indicator — e.g. "Today's Appointments: 24, +12% vs last week" on a dashboard (Phase 6/17 scope; this is the presentational primitive only, real numbers come from those phases' data). */
export function MetricCard({ label, value, trend, className }: MetricCardProps) {
  const isPositive = typeof trend === 'number' && trend >= 0;
  return (
    <Card className={className}>
      <CardHeader className="pb-0">
        <p className="text-sm text-text-secondary">{label}</p>
      </CardHeader>
      <CardContent className="flex items-end justify-between gap-2">
        <p className="text-3xl font-semibold text-text-primary">{value}</p>
        {typeof trend === 'number' && (
          <span
            className={cn(
              'flex items-center gap-1 text-sm font-medium',
              isPositive ? 'text-success' : 'text-danger',
            )}
          >
            <Icon icon={isPositive ? TrendingUp : TrendingDown} size="sm" />
            {Math.abs(trend)}%
          </span>
        )}
      </CardContent>
    </Card>
  );
}
