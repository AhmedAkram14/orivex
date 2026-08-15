import type { LucideIcon } from 'lucide-react';
import { Link } from '@/shared/i18n/navigation';
import { Icon } from '@/shared/icons/icon';
import { cn } from '@/shared/lib/cn';

export interface ScheduleCardProps {
  icon: LucideIcon;
  title: string;
  /** Pre-formatted, localized date text (e.g. "Today", "Mon, Jul 14"). */
  dateLabel: string;
  /** Pre-formatted, localized time text (e.g. "2:00 PM – 3:00 PM"). */
  timeLabel: string;
  href?: string;
  className?: string;
}

const cardClass = cn(
  'flex items-start gap-3 rounded-lg border border-border-default bg-surface p-4 transition-colors duration-(--duration-fast)',
);

/** A compact schedule-fact summary card (e.g. "Next available slot — Today, 2:00 PM – 3:00 PM") — the building block for any dashboard/workspace surface that needs to headline a single schedule item, distinct from `TimelineCard` (one row in a list) and `AvailabilityBlock` (a calendar-grid cell). */
export function ScheduleCard({ icon, title, dateLabel, timeLabel, href, className }: ScheduleCardProps) {
  const content = (
    <>
      <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-primary-subtle text-primary-emphasis">
        <Icon icon={icon} size="md" />
      </div>
      <div className="flex flex-col gap-0.5">
        <p className="text-sm font-medium text-text-primary">{title}</p>
        <p className="text-sm text-text-secondary">{dateLabel}</p>
        <p className="text-xs text-text-tertiary">{timeLabel}</p>
      </div>
    </>
  );

  if (href) {
    return (
      <Link
        href={href}
        className={cn(cardClass, 'hover:bg-secondary-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring', className)}
      >
        {content}
      </Link>
    );
  }

  return <div className={cn(cardClass, className)}>{content}</div>;
}
