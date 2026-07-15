import type { ReactNode } from 'react';
import { cn } from '@/shared/lib/cn';

export interface WeeklyCalendarDay {
  id: string;
  /** Pre-formatted, localized short day label (e.g. "Mon"). */
  dayLabel: string;
  /** Pre-formatted, localized date label (e.g. "14"). */
  dateLabel: string;
  isToday?: boolean;
  isSelected?: boolean;
  onSelect?: () => void;
  /** Typically an `AvailabilityBlock` or a compact summary for the day. */
  content?: ReactNode;
}

export interface WeeklyCalendarProps {
  days: WeeklyCalendarDay[];
  className?: string;
}

/** A 7-column week grid — each day a header (day + date, clickable when `onSelect` is given) plus whatever summary content the caller supplies. Drilling into a day's full `DailyTimeline` is a separate, composed view; this component only lays the week out. */
export function WeeklyCalendar({ days, className }: WeeklyCalendarProps) {
  return (
    <div className={cn('grid grid-cols-7 gap-2', className)}>
      {days.map((day) => {
        const header = (
          <div className="flex flex-col items-center gap-0.5">
            <span className="text-xs text-text-tertiary">{day.dayLabel}</span>
            <span
              className={cn(
                'flex size-7 items-center justify-center rounded-full text-sm font-medium',
                day.isToday ? 'bg-primary text-primary-foreground' : 'text-text-primary',
              )}
            >
              {day.dateLabel}
            </span>
          </div>
        );

        return (
          <div
            key={day.id}
            className={cn(
              'flex flex-col gap-2 rounded-lg border p-2',
              day.isSelected ? 'border-primary' : 'border-border-default',
            )}
          >
            {day.onSelect ? (
              <button
                type="button"
                onClick={day.onSelect}
                aria-current={day.isSelected ? 'date' : undefined}
                className="rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
              >
                {header}
              </button>
            ) : (
              header
            )}
            {day.content}
          </div>
        );
      })}
    </div>
  );
}
