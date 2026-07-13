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
      <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-primary-subtle text-primary">
        <Icon icon={icon} size="md" />
      </div>
      <div className="flex flex-col">
        <p className="text-xs text-text-tertiary">{label}</p>
        <p className="text-lg font-semibold text-text-primary">{value}</p>
      </div>
    </div>
  );
}
