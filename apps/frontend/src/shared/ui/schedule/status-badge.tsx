import type { ReactNode } from 'react';
import { Badge, type BadgeProps } from '@/shared/ui/badge';

export type ScheduleStatusTone = 'available' | 'booked' | 'blocked' | 'pending' | 'confirmed' | 'cancelled' | 'past';

const variantByTone: Record<ScheduleStatusTone, NonNullable<BadgeProps['variant']>> = {
  available: 'success',
  booked: 'primary',
  confirmed: 'success',
  pending: 'neutral',
  cancelled: 'danger',
  blocked: 'neutral',
  past: 'neutral',
};

export interface StatusBadgeProps {
  tone: ScheduleStatusTone;
  label: ReactNode;
  className?: string;
}

/**
 * The single tone → `Badge` variant mapping for every scheduling status
 * across this module (slots, bookings, agenda entries) — extracted so
 * `AgendaList`, `BookingSummaryCard`, and any future scheduling surface
 * share one mapping instead of each re-declaring its own
 * `Record<Status, Variant>`.
 */
export function StatusBadge({ tone, label, className }: StatusBadgeProps) {
  return (
    <Badge variant={variantByTone[tone]} className={className}>
      {label}
    </Badge>
  );
}
