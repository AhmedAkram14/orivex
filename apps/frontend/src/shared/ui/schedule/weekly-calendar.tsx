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
  /** Screen-reader-only text appended to today's date (e.g. "Today") — the visual highlight alone doesn't announce anything. */
  todayAnnouncement?: string;
  className?: string;
}

/**
 * A 7-column week grid — each day a header (day + date, clickable when
 * `onSelect` is given) plus whatever summary content the caller supplies.
 * Drilling into a day's full `DailyTimeline` is a separate, composed view;
 * this component only lays the week out.
 *
 * Below `sm`, a rigid 7-up grid crushes each column too narrow for its own
 * content (e.g. an hours range wrapping mid-word) — so under that width
 * this scrolls horizontally instead, with every day column holding a real
 * minimum width, exactly the "recompose, don't squeeze" rule this design
 * system uses elsewhere (the mobile specialties carousel, the Schedule
 * page's own tab bar).
 */
export function WeeklyCalendar({ days, todayAnnouncement, className }: WeeklyCalendarProps) {
  return (
    <div className={cn('flex gap-2 overflow-x-auto pb-1 sm:grid sm:grid-cols-7 sm:overflow-visible sm:pb-0', className)}>
      {days.map((day) => {
        const header = (
          <div className="flex flex-col items-center gap-0.5">
            <span className="text-xs text-text-tertiary">{day.dayLabel}</span>
            <span
              className={cn(
                'flex size-7 items-center justify-center rounded-full text-sm font-medium',
                day.isToday || day.isSelected ? 'bg-primary text-primary-foreground' : 'text-text-primary',
              )}
            >
              {day.dateLabel}
              {day.isToday && todayAnnouncement && <span className="sr-only"> ({todayAnnouncement})</span>}
            </span>
          </div>
        );

        return (
          <div
            key={day.id}
            className={cn(
              'flex w-24 shrink-0 flex-col gap-2 rounded-lg border p-2 transition-colors duration-(--duration-fast) sm:w-auto',
              day.isSelected ? 'border-primary bg-primary-subtle' : 'border-border-default',
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
