import type { ReactNode } from 'react';
import { Legend, type LegendItem } from '@/shared/ui/schedule/legend';
import { cn } from '@/shared/lib/cn';

export interface CalendarSidebarProps {
  legendItems?: LegendItem[];
  /** Additional real content (e.g. a mini date picker, filters) — omitted entirely when the caller has nothing beyond the legend, never a placeholder section. */
  children?: ReactNode;
  className?: string;
}

/**
 * A calendar's companion panel — today just the status `Legend`, with a
 * `children` slot for whatever a future calendar consumer adds (a mini
 * month picker, filters) without this component needing to change shape
 * for it.
 */
export function CalendarSidebar({ legendItems, children, className }: CalendarSidebarProps) {
  return (
    <div className={cn('flex flex-col gap-4 rounded-lg border border-border-default bg-surface p-4', className)}>
      {legendItems && <Legend items={legendItems} />}
      {children}
    </div>
  );
}
