import { Icon } from '@/shared/icons/icon';
import { Calendar, Clock } from 'lucide-react';
import { cn } from '@/shared/lib/cn';

export interface AvailabilityCardProps {
  /** Pre-formatted, localized day label (e.g. "Monday"). */
  dayLabel: string;
  isWorkingDay: boolean;
  /** Pre-formatted, localized hours text (e.g. "9:00 AM – 5:00 PM") — only meaningful when `isWorkingDay` is true. */
  hoursLabel?: string;
  /** e.g. "1 break" — omitted when there are none. */
  breaksLabel?: string;
  notWorkingLabel: string;
  className?: string;
}

/**
 * A single recurring day's availability summary — a compact read-only row
 * for `WorkingHoursForm`'s own summary view (the View-mode counterpart to
 * its edit form), distinct from `AvailabilityBlock` (a calendar-grid cell
 * chip) and `ScheduleCard` (a single headline schedule fact, not a
 * per-day list row).
 */
export function AvailabilityCard({
  dayLabel,
  isWorkingDay,
  hoursLabel,
  breaksLabel,
  notWorkingLabel,
  className,
}: AvailabilityCardProps) {
  return (
    <div
      className={cn(
        'flex items-center justify-between gap-3 rounded-lg border border-border-default bg-surface p-3',
        className,
      )}
    >
      <div className="flex items-center gap-2">
        <Icon icon={Calendar} size="sm" className="text-text-tertiary" />
        <span className="text-sm font-medium text-text-primary">{dayLabel}</span>
      </div>
      {isWorkingDay ? (
        <div className="flex items-center gap-3 text-sm text-text-secondary">
          <span className="flex items-center gap-1">
            <Icon icon={Clock} size="sm" className="text-text-tertiary" />
            {hoursLabel}
          </span>
          {breaksLabel && <span className="text-text-tertiary">{breaksLabel}</span>}
        </div>
      ) : (
        <span className="text-sm text-text-tertiary">{notWorkingLabel}</span>
      )}
    </div>
  );
}
