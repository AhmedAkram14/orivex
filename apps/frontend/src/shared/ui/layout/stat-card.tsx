import type { LucideIcon } from 'lucide-react';
import { Icon } from '@/shared/icons/icon';
import { cn } from '@/shared/lib/cn';

export interface StatCardProps {
  icon: LucideIcon;
  label: string;
  value: string;
  className?: string;
}

// A stat tile's value slot is sized/weighted for a short figure ("24",
// "4.7", "—") -- a caller that instead hands it a sentence ("No ratings
// yet") renders prose at number size, which is exactly what overflowed the
// Doctor Overview KPI row (Phase 1 UX remediation). Every real caller today
// passes either a real numeric-looking string or the explicit empty-value
// dash, so this is a defensive backstop, not something normal usage should
// ever hit: past this length, the value shrinks and wraps instead of
// blowing out the tile's fixed-width grid column at 1150px/390px.
const LONG_VALUE_THRESHOLD = 8;

/** A compact icon + label + value tile — for a dense row/grid of small stats, distinct from MetricCard (one large KPI with a trend). */
export function StatCard({ icon, label, value, className }: StatCardProps) {
  const isLongValue = value.length > LONG_VALUE_THRESHOLD;
  return (
    <div
      className={cn(
        'flex items-center gap-3 rounded-lg border border-border-default bg-surface p-4',
        className,
      )}
    >
      <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-primary-subtle text-primary-emphasis">
        <Icon icon={icon} size="md" />
      </div>
      <div className="flex min-w-0 flex-col">
        {/* min-h reserves two lines' height so a wrapping label in one tile doesn't push its value below a sibling tile's, see LinkableStatCard's own comment on this. */}
        <p className="min-h-8 text-xs leading-4 text-text-tertiary">{label}</p>
        <p className={cn('font-semibold text-text-primary', isLongValue ? 'text-sm wrap-break-word' : 'text-lg')}>{value}</p>
      </div>
    </div>
  );
}
