import { cn } from '@/shared/lib/cn';

export interface AvailabilityBlockProps {
  /** Pre-formatted, localized start/end labels (e.g. "9:00 AM", "5:00 PM"). */
  startLabel: string;
  endLabel: string;
  label?: string;
  className?: string;
}

/** A recurring availability window (e.g. "9:00 AM – 5:00 PM") — the summary-level building block a `WeeklyCalendar`/`DailyTimeline` renders per day, distinct from `TimeSlot` (one bookable hour within such a window). */
export function AvailabilityBlock({ startLabel, endLabel, label, className }: AvailabilityBlockProps) {
  return (
    <div
      className={cn(
        'flex flex-col gap-0.5 rounded-md border border-success-subtle bg-success-subtle p-2 text-xs text-success',
        className,
      )}
    >
      <span className="font-medium">
        {startLabel} – {endLabel}
      </span>
      {label && <span className="text-success/80">{label}</span>}
    </div>
  );
}
