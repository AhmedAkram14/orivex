import type { ReactNode } from 'react';
import { cn } from '@/shared/lib/cn';

export interface DailyTimelineRow {
  id: string;
  /** Pre-formatted, localized hour label (e.g. "9:00 AM"). */
  hourLabel: string;
  /** Typically a `TimeSlot` or `AvailabilityBlock` for this hour — omitted for an empty hour. */
  content?: ReactNode;
}

export interface DailyTimelineProps {
  rows: DailyTimelineRow[];
  className?: string;
}

/** A single day's vertical hour-by-hour timeline — the detail view a `WeeklyCalendar` day column expands into. Each row is just an hour label plus whatever content the caller supplies for that hour; this component holds no scheduling data itself. */
export function DailyTimeline({ rows, className }: DailyTimelineProps) {
  return (
    <div className={cn('flex flex-col divide-y divide-border-default', className)}>
      {rows.map((row) => (
        <div key={row.id} className="flex gap-3 py-2">
          <span className="w-20 shrink-0 pt-2 text-xs font-medium text-text-tertiary">{row.hourLabel}</span>
          <div className="flex-1">{row.content}</div>
        </div>
      ))}
    </div>
  );
}
