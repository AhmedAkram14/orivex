import type { ReactNode } from 'react';
import { Heading } from '@/design-system/typography';
import { cn } from '@/shared/lib/cn';

export interface CalendarHeaderProps {
  /** Pre-formatted, localized range/date label (e.g. "Jul 13 – Jul 19, 2026") — this component never formats a date itself. */
  label: string;
  /** Typically a `DateNavigation`. */
  navigation?: ReactNode;
  /** Typically a view switcher (Week/Day) or other calendar-level action. */
  actions?: ReactNode;
  className?: string;
}

/** The title region of any schedule view — the calendar's own `PageHeader` equivalent, kept separate since a calendar's "title" is a date range plus navigation controls, not a static page title. Carries its own bottom margin since it's always immediately followed by the calendar body it's titling (WeeklyCalendar/MonthCalendar/etc.) with no wrapper in between to add spacing. */
export function CalendarHeader({ label, navigation, actions, className }: CalendarHeaderProps) {
  return (
    <div className={cn('mb-4 flex flex-wrap items-center justify-between gap-4', className)}>
      <Heading level={2}>{label}</Heading>
      <div className="flex items-center gap-2">
        {navigation}
        {actions}
      </div>
    </div>
  );
}
