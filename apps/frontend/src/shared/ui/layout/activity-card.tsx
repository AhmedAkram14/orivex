import type { LucideIcon } from 'lucide-react';
import { Icon } from '@/shared/icons/icon';
import { cn } from '@/shared/lib/cn';

export interface ActivityCardProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  /** Pre-formatted, localized timestamp text (e.g. via `Intl.RelativeTimeFormat` or `toLocaleString`) — this component never formats a date itself, so it never has to guess a locale. */
  timestamp?: string;
  className?: string;
}

/** A single timeline/activity entry — icon, title, optional description, optional timestamp. The building block `RecentActivityContainer` renders a list of; also usable standalone wherever a page needs one activity row (e.g. inside a detail page's audit trail, once Phase 19's audit module exists). */
export function ActivityCard({ icon, title, description, timestamp, className }: ActivityCardProps) {
  return (
    <div className={cn('flex items-start gap-3', className)}>
      <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-secondary-subtle text-text-tertiary">
        <Icon icon={icon} size="sm" />
      </div>
      <div className="flex flex-1 flex-col gap-0.5">
        <p className="text-sm font-medium text-text-primary">{title}</p>
        {description && <p className="text-sm text-text-secondary">{description}</p>}
      </div>
      {timestamp && <span className="shrink-0 text-xs text-text-tertiary">{timestamp}</span>}
    </div>
  );
}
