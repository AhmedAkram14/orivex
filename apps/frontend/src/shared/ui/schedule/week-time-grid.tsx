import { cn } from '@/shared/lib/cn';

/** One hour row's pixel height — shared by the hour-label gutter and every block's top/height math, so they can never drift apart. */
const HOUR_ROW_HEIGHT_PX = 64;

export type WeekTimeGridAccent = 'info' | 'success' | 'warning' | 'danger' | 'neutral';

const ACCENT_CLASSES: Record<WeekTimeGridAccent, { bar: string; bg: string; text: string }> = {
  info: { bar: 'border-info', bg: 'bg-info-subtle', text: 'text-info-emphasis' },
  success: { bar: 'border-success', bg: 'bg-success-subtle', text: 'text-success-emphasis' },
  warning: { bar: 'border-warning', bg: 'bg-warning-subtle', text: 'text-warning-emphasis' },
  danger: { bar: 'border-danger', bg: 'bg-danger-subtle', text: 'text-danger-emphasis' },
  neutral: { bar: 'border-border-strong', bg: 'bg-neutral-subtle', text: 'text-text-secondary' },
};

export interface WeekTimeGridAppointment {
  id: string;
  /** Minutes since local midnight. */
  startMinutes: number;
  /** Minutes since local midnight. Must be > startMinutes. */
  endMinutes: number;
  /** Patient name — the block's primary line. */
  primaryLabel: string;
  /** Pre-formatted, localized visit-type label (e.g. "Follow up") — omitted when the appointment predates the `appointmentType` field. */
  secondaryLabel?: string;
  /** Pre-formatted, localized start time (e.g. "10:00 AM"). */
  timeLabel: string;
  /** Falls back to `neutral` for an appointment with no real `appointmentType` — an honest "uncategorized" look, never a guessed category. */
  accent?: WeekTimeGridAccent;
  onSelect?: () => void;
}

export interface WeekTimeGridDay {
  id: string;
  appointments: WeekTimeGridAppointment[];
}

export interface WeekTimeGridProps {
  /** One entry per day column, left to right — must align with whatever day-header strip is rendered above this grid. */
  days: WeekTimeGridDay[];
  /** Pre-formatted, localized hour labels (e.g. "8 AM"), one per row, top to bottom. */
  hourLabels: string[];
  className?: string;
}

/**
 * The Schedule page's real hour-by-hour weekly grid — positioned,
 * duration-sized appointment blocks per day column, Google-Calendar-style.
 * Deliberately separate from `WeeklyCalendar` (the day-header strip above
 * it, unchanged): this component only lays out the timed body, so it has no
 * opinion on day labels/dates/availability chips.
 *
 * Positioning is plain top/height math off `HOUR_ROW_HEIGHT_PX`, not a CSS
 * grid line per minute — simplest thing that's pixel-accurate for a fixed
 * hour range. Overlapping appointments in the same day aren't
 * side-by-side-split (a real but rare edge case); v1 accepts visual overlap
 * rather than building full interval-scheduling layout for it.
 */
export function WeekTimeGrid({ days, hourLabels, className }: WeekTimeGridProps) {
  const totalHeight = hourLabels.length * HOUR_ROW_HEIGHT_PX;
  const startMinutesOfGrid = 0; // callers pass startMinutes/endMinutes already relative to the grid's own first hour

  return (
    <div className={cn('flex', className)}>
      <div className="flex shrink-0 flex-col text-end" style={{ width: 56 }}>
        {hourLabels.map((label) => (
          <div
            key={label}
            className="pe-2 text-xs text-text-tertiary"
            style={{ height: HOUR_ROW_HEIGHT_PX, marginTop: -8 }}
          >
            {label}
          </div>
        ))}
      </div>

      <div
        className="grid flex-1 divide-x divide-border-default"
        style={{
          gridTemplateColumns: `repeat(${days.length}, minmax(0, 1fr))`,
          height: totalHeight,
          backgroundImage: `repeating-linear-gradient(to bottom, var(--color-border-default) 0, var(--color-border-default) 1px, transparent 1px, transparent ${HOUR_ROW_HEIGHT_PX}px)`,
        }}
      >
        {days.map((day) => (
          <div key={day.id} className="relative">
            {day.appointments.map((appointment) => {
              const top = ((appointment.startMinutes - startMinutesOfGrid) / 60) * HOUR_ROW_HEIGHT_PX;
              const height = Math.max(
                20,
                ((appointment.endMinutes - appointment.startMinutes) / 60) * HOUR_ROW_HEIGHT_PX - 2,
              );
              const accent = ACCENT_CLASSES[appointment.accent ?? 'neutral'];
              const sharedClassName = cn(
                'absolute inset-x-0.5 overflow-hidden rounded-md border-s-4 px-2 py-1 text-start transition-shadow duration-(--duration-fast)',
                accent.bar,
                accent.bg,
                appointment.onSelect && 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring hover:shadow-sm',
              );
              const label = (
                <>
                  <p className={cn('truncate text-xs font-semibold', accent.text)}>{appointment.timeLabel}</p>
                  <p className="truncate text-xs font-medium text-text-primary">{appointment.primaryLabel}</p>
                  {appointment.secondaryLabel && height > 44 && (
                    <p className="truncate text-xs text-text-secondary">{appointment.secondaryLabel}</p>
                  )}
                </>
              );

              return appointment.onSelect ? (
                <button
                  key={appointment.id}
                  type="button"
                  onClick={appointment.onSelect}
                  className={sharedClassName}
                  style={{ top, height }}
                >
                  {label}
                </button>
              ) : (
                <div key={appointment.id} className={sharedClassName} style={{ top, height }}>
                  {label}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
