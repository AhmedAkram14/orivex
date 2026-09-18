import type { LucideIcon } from 'lucide-react';
import { Icon } from '@/shared/icons/icon';
import { cn } from '@/shared/lib/cn';

export interface StatCardProps {
  icon: LucideIcon;
  label: string;
  value: string;
  className?: string;
}

/** A compact icon + label + value tile — for a dense row/grid of small stats, distinct from MetricCard (one large KPI with a trend). */
export function StatCard({ icon, label, value, className }: StatCardProps) {
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
      <div className="flex flex-col">
        {/* min-h reserves two lines' height so a wrapping label in one tile doesn't push its value below a sibling tile's, see LinkableStatCard's own comment on this. */}
        <p className="min-h-8 text-xs leading-4 text-text-tertiary">{label}</p>
        <p className="text-lg font-semibold text-text-primary">{value}</p>
      </div>
    </div>
  );
}
