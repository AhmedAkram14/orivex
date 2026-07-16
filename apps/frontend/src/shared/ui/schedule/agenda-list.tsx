import type { ReactNode } from 'react';
import { Badge } from '@/shared/ui/badge';
import { EmptyState } from '@/shared/ui/empty-state';
import { cn } from '@/shared/lib/cn';

export type AgendaItemStatus = 'available' | 'booked' | 'blocked' | 'past';

const badgeVariantByStatus: Record<AgendaItemStatus, 'success' | 'primary' | 'neutral'> = {
  available: 'success',
  booked: 'primary',
  blocked: 'neutral',
  past: 'neutral',
};

export interface AgendaItem {
  id: string;
  /** Pre-formatted, localized date text (e.g. "Mon, Jul 20"). */
  dateLabel: string;
  /** Pre-formatted, localized time text (e.g. "9:00 AM"). */
  timeLabel: string;
  title: string;
  status: AgendaItemStatus;
  statusLabel: ReactNode;
}

export interface AgendaListProps {
  items: AgendaItem[];
  emptyTitle: string;
  emptyDescription?: string;
  className?: string;
}

/**
 * The "enterprise calendar" Agenda view (Milestone 3) — a flat,
 * chronological list spanning multiple days, distinct from `DailyTimeline`
 * (one day, hour-by-hour) and `WeeklyCalendar`/`MonthCalendar` (grid
 * layouts). The view of choice for scanning "what's coming up" without a
 * grid's visual overhead.
 */
export function AgendaList({ items, emptyTitle, emptyDescription, className }: AgendaListProps) {
  if (items.length === 0) {
    return <EmptyState title={emptyTitle} description={emptyDescription} />;
  }

  return (
    <ul className={cn('flex flex-col gap-2', className)}>
      {items.map((item) => (
        <li
          key={item.id}
          className="flex items-center justify-between gap-3 rounded-lg border border-border-default bg-surface p-3"
        >
          <div className="flex items-center gap-3">
            <div className="flex flex-col">
              <span className="text-sm font-medium text-text-primary">{item.dateLabel}</span>
              <span className="text-xs text-text-tertiary">{item.timeLabel}</span>
            </div>
            <span className="text-sm text-text-secondary">{item.title}</span>
          </div>
          <Badge variant={badgeVariantByStatus[item.status]}>{item.statusLabel}</Badge>
        </li>
      ))}
    </ul>
  );
}
