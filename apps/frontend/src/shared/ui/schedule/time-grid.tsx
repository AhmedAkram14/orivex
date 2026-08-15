import { Tooltip, TooltipContent, TooltipTrigger } from '@/shared/ui/tooltip';
import { TimeSlot, type TimeSlotStatus } from '@/shared/ui/schedule/time-slot';
import { cn } from '@/shared/lib/cn';

export interface TimeGridSlot {
  id: string;
  /** Pre-formatted, localized time text (e.g. "09:00 AM"). */
  timeLabel: string;
  status: TimeSlotStatus;
  /** Rendered directly on the cell (e.g. "FREE", "500 EGP") — pricing must never hide behind a hover-only affordance, so this is distinct from `detail`. */
  label?: string;
  /** See `TimeSlotProps.priceVariant` — set only when `label` is a real consultation price. */
  priceVariant?: 'free' | 'paid';
  /** Extra context shown on hover/focus (e.g. "Booked — reserved", "Inside a break") — omitted entirely when there's nothing more to say than the status itself already shows. */
  detail?: string;
  onSelect?: () => void;
}

export interface TimeGridProps {
  slots: TimeGridSlot[];
  className?: string;
}

/**
 * A responsive grid of `TimeSlot`s — the "enterprise calendar" Day view's
 * real slot grid (Milestone 3), distinct from `DailyTimeline`'s
 * hour-row list: this component is for a day whose slots are worth
 * browsing at a glance (many short slots), not annotating hour-by-hour.
 * A slot only gets a hover/focus tooltip when it carries real `detail` —
 * never a fabricated explanation.
 */
export function TimeGrid({ slots, className }: TimeGridProps) {
  return (
    <div className={cn('grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4', className)}>
      {slots.map((slot) => {
        const cell = (
          <TimeSlot
            time={slot.timeLabel}
            status={slot.status}
            label={slot.label}
            priceVariant={slot.priceVariant}
            onSelect={slot.onSelect}
          />
        );

        if (!slot.detail) return <div key={slot.id}>{cell}</div>;

        return (
          <Tooltip key={slot.id}>
            <TooltipTrigger asChild>{cell}</TooltipTrigger>
            <TooltipContent>{slot.detail}</TooltipContent>
          </Tooltip>
        );
      })}
    </div>
  );
}
