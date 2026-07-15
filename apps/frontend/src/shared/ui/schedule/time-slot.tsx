import { cn } from '@/shared/lib/cn';

export type TimeSlotStatus = 'available' | 'booked' | 'blocked';

export interface TimeSlotProps {
  /** Pre-formatted, localized time text (e.g. "09:00 AM"). */
  time: string;
  status: TimeSlotStatus;
  label?: string;
  onSelect?: () => void;
  className?: string;
}

const statusClass: Record<TimeSlotStatus, string> = {
  available: 'border-success-subtle bg-success-subtle text-success',
  booked: 'border-primary-subtle bg-primary-subtle text-primary',
  blocked: 'border-border-default bg-canvas text-text-tertiary',
};

/**
 * A single bookable time cell — presentational only, no booking logic
 * (Phase 7's explicit "no appointment logic yet" scope). `onSelect` is
 * only wired up for an `available` slot; a `booked`/`blocked` slot
 * renders as a static, non-interactive cell.
 */
export function TimeSlot({ time, status, label, onSelect, className }: TimeSlotProps) {
  const content = (
    <>
      <span className="font-medium">{time}</span>
      {label && <span className="truncate">{label}</span>}
    </>
  );

  if (status === 'available' && onSelect) {
    return (
      <button
        type="button"
        onClick={onSelect}
        className={cn(
          'flex items-center gap-2 rounded-md border px-3 py-2 text-start text-sm transition-colors',
          'hover:brightness-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring',
          statusClass[status],
          className,
        )}
      >
        {content}
      </button>
    );
  }

  return (
    <div className={cn('flex items-center gap-2 rounded-md border px-3 py-2 text-sm', statusClass[status], className)}>
      {content}
    </div>
  );
}
