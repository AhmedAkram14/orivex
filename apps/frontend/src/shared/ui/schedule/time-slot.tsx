import { cn } from '@/shared/lib/cn';

export type TimeSlotStatus = 'available' | 'booked' | 'blocked';

export interface TimeSlotProps {
  /** Pre-formatted, localized time text (e.g. "09:00 AM"). */
  time: string;
  status: TimeSlotStatus;
  label?: string;
  /** Only set when `label` is a real consultation price — distinguishes a FREE slot (bold success pill, not just smaller text next to the time) from a Paid one (emphasized price text) so the two never read as visually equivalent. Omitted entirely for callers with no pricing fact to show (e.g. the doctor's own Day view, which never renders `label`). */
  priceVariant?: 'free' | 'paid';
  onSelect?: () => void;
  className?: string;
}

const statusClass: Record<TimeSlotStatus, string> = {
  available: 'border-border-strong bg-surface text-text-primary',
  booked: 'border-text-primary bg-text-primary text-text-inverse',
  blocked: 'border-border-default bg-surface-2 text-text-tertiary',
};

/**
 * A single bookable time cell — presentational only, no booking logic
 * (Phase 7's explicit "no appointment logic yet" scope). `onSelect` is
 * only wired up for an `available` slot; a `booked`/`blocked` slot
 * renders as a static, non-interactive cell.
 */
export function TimeSlot({ time, status, label, priceVariant, onSelect, className }: TimeSlotProps) {
  const content = (
    <>
      <span className="font-medium">{time}</span>
      {label && priceVariant === 'free' && (
        <span className="ms-auto shrink-0 rounded-full bg-success-subtle px-2 py-0.5 text-caption font-semibold text-success-emphasis">
          {label}
        </span>
      )}
      {label && priceVariant === 'paid' && <span className="ms-auto shrink-0 truncate font-semibold">{label}</span>}
      {label && !priceVariant && <span className="truncate">{label}</span>}
    </>
  );

  if (status === 'available' && onSelect) {
    return (
      <button
        type="button"
        onClick={onSelect}
        className={cn(
          'flex flex-wrap items-center gap-x-2 gap-y-0.5 rounded-md border px-3 py-2 text-start text-sm transition-colors duration-(--duration-fast) ease-standard',
          'hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring pointer-coarse:min-h-11',
          statusClass[status],
          className,
        )}
      >
        {content}
      </button>
    );
  }

  return (
    <div className={cn('flex flex-wrap items-center gap-x-2 gap-y-0.5 rounded-md border px-3 py-2 text-sm', statusClass[status], className)}>
      {content}
    </div>
  );
}
