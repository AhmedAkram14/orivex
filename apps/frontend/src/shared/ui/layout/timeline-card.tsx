import type { ReactNode } from 'react';
import { Badge } from '@/shared/ui/badge';
import { cn } from '@/shared/lib/cn';

export type TimelineCardStatus = 'upcoming' | 'in-progress' | 'completed' | 'cancelled';

export interface TimelineCardProps {
  /** Pre-formatted, localized time text (e.g. "09:30 AM") — this component never formats a time itself. */
  time: string;
  title: string;
  description?: string;
  status?: TimelineCardStatus;
  statusLabel?: ReactNode;
  className?: string;
}

const badgeVariantByStatus: Record<TimelineCardStatus, 'info' | 'warning' | 'success' | 'neutral'> = {
  upcoming: 'info',
  'in-progress': 'warning',
  completed: 'success',
  cancelled: 'neutral',
};

/**
 * A single scheduled-time entry — distinct from `ActivityCard` (a past
 * event with an optional relative timestamp): `TimelineCard` always leads
 * with a fixed time slot and an optional status badge, the shape a
 * schedule/queue/upcoming-work list needs. The list container using this
 * (e.g. a future "Upcoming Work Area") supplies real, caller-keyed items —
 * this component itself holds no state or data-fetching.
 */
export function TimelineCard({ time, title, description, status, statusLabel, className }: TimelineCardProps) {
  return (
    <div className={cn('flex items-start gap-3', className)}>
      <p className="w-16 shrink-0 pt-0.5 text-sm font-medium text-text-secondary">{time}</p>
      <div className="flex flex-1 flex-col gap-0.5">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium text-text-primary">{title}</p>
          {status && statusLabel && <Badge variant={badgeVariantByStatus[status]}>{statusLabel}</Badge>}
        </div>
        {description && <p className="text-sm text-text-secondary">{description}</p>}
      </div>
    </div>
  );
}
