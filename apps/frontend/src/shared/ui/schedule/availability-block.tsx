import { cn } from '@/shared/lib/cn';

export interface AvailabilityBlockProps {
  /** Pre-formatted, localized start/end labels (e.g. "9:00 AM", "5:00 PM"). Ignored when `rangeText` is given. */
  startLabel: string;
  endLabel: string;
  /**
   * Overrides the plain `"{startLabel} – {endLabel}"` line -- for a day with
   * a break, the effective bookable window(s) rather than the raw full-day
   * span (e.g. "10:00 – 13:00" for a day whose recorded hours run to 18:00
   * but has a 13:00–18:00 break), or a joined multi-window list.
   */
  rangeText?: string;
  label?: string;
  className?: string;
}

/** A recurring availability window (e.g. "9:00 AM – 5:00 PM") — the summary-level building block a `WeeklyCalendar`/`DailyTimeline` renders per day, distinct from `TimeSlot` (one bookable hour within such a window). */
export function AvailabilityBlock({ startLabel, endLabel, rangeText, label, className }: AvailabilityBlockProps) {
  return (
    <div
      className={cn(
        'flex flex-col gap-0.5 rounded-md border border-success-subtle bg-success-subtle p-2 text-xs text-success-emphasis',
        className,
      )}
    >
      <span className="font-medium">{rangeText ?? `${startLabel} – ${endLabel}`}</span>
      {label && <span className="text-success/80">{label}</span>}
    </div>
  );
}
