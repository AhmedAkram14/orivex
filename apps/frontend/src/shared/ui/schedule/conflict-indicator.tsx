import { AlertTriangle } from 'lucide-react';
import { Icon } from '@/shared/icons/icon';
import { cn } from '@/shared/lib/cn';

export interface ConflictIndicatorProps {
  /** A real, localized reason (e.g. "Outside working hours") — this component never fabricates or guesses a reason, the caller must supply one from `ConflictReason`/`detectConflict` (`features/scheduling/utils/conflicts.ts`). */
  message: string;
  className?: string;
}

/**
 * The double-book-prevention architecture's visual counterpart —
 * surfaces a real `ConflictReason` inline wherever a candidate booking
 * fails `detectConflict` (Milestone 6 wires this into the Booking Flow's
 * slot selection). Deliberately not a tooltip: a conflict is worth a
 * persistent, always-visible warning, not something a user has to hover
 * to discover.
 */
export function ConflictIndicator({ message, className }: ConflictIndicatorProps) {
  return (
    <div className={cn('flex items-center gap-1.5 text-xs text-danger', className)} role="alert">
      <Icon icon={AlertTriangle} size="xs" />
      {message}
    </div>
  );
}
