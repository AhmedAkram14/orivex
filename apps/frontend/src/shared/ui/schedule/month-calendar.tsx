import type { ReactNode } from 'react';
import { cn } from '@/shared/lib/cn';

export interface MonthCalendarDay {
  id: string;
  /** Pre-formatted, localized day-of-month label (e.g. "14"). */
  dateLabel: string;
  isCurrentMonth: boolean;
  isToday?: boolean;
  isSelected?: boolean;
  onSelect?: () => void;
  /** Typically a small status dot/badge — omitted for a day with nothing to show. */
  content?: ReactNode;
}

export interface MonthCalendarProps {
  /** Always 42 entries (6 full weeks) — the caller builds this from `shared/lib/date/month.ts`'s `getMonthGridDays`, so this component stays date-math-free. */
  days: MonthCalendarDay[];
  /** 7 pre-formatted, localized short weekday labels (Sun..Sat) — this component never derives weekday names itself. */
  weekDayLabels: string[];
  className?: string;
}

/**
 * A month grid — the "Monthly view" primitive `WeeklyCalendar`'s week-only
 * layout doesn't cover. Days outside the target month render visually
 * muted but stay in the grid (never hidden), so the 6-row layout is always
 * stable regardless of which weekday the month starts on.
 */
export function MonthCalendar({ days, weekDayLabels, className }: MonthCalendarProps) {
  return (
    <div className={cn('flex flex-col gap-1', className)}>
      <div className="grid grid-cols-7 gap-1">
        {weekDayLabels.map((label) => (
          <span key={label} className="p-1 text-center text-xs font-medium text-text-tertiary">
            {label}
          </span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {days.map((day) => {
          const cell = (
            <span
              className={cn(
                'flex size-7 items-center justify-center rounded-full text-sm font-medium',
                day.isToday ? 'bg-primary text-primary-foreground' : 'text-text-primary',
                !day.isCurrentMonth && 'text-text-tertiary/50',
              )}
            >
              {day.dateLabel}
            </span>
          );

          return (
            <div
              key={day.id}
              className={cn(
                'flex min-h-16 flex-col items-center gap-1 rounded-md border p-1',
                day.isSelected ? 'border-primary' : 'border-transparent',
              )}
            >
              {day.onSelect ? (
                <button
                  type="button"
                  onClick={day.onSelect}
                  aria-current={day.isSelected ? 'date' : undefined}
                  className="rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
                >
                  {cell}
                </button>
              ) : (
                cell
              )}
              {day.content}
            </div>
          );
        })}
      </div>
    </div>
  );
}
