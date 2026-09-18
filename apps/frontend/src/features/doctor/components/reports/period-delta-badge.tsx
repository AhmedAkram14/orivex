'use client';

import { ArrowDown, ArrowUp, Minus } from 'lucide-react';
import { Icon } from '@/shared/icons/icon';
import { cn } from '@/shared/lib/cn';

export interface PeriodDeltaBadgeProps {
  current: number;
  /** Undefined when `comparePrevious` wasn't requested or the backend omitted `previousPeriod` -- renders nothing rather than a fabricated "no change." */
  previous: number | undefined;
  /**
   * Whether a higher current-vs-previous value reads as an improvement --
   * true for e.g. Completed, false for e.g. Cancelled. No hardcoded
   * "up = green": the same upward arrow is a good sign on one tile and a bad
   * one on another.
   */
  direction: 'higher-is-better' | 'lower-is-better';
  className?: string;
}

/**
 * Doctor Reports page rebuild (Phase 3): the "vs previous period" delta next
 * to Total/Completed/Cancelled when "compare previous period" is on --
 * deliberately kept separate from `LinkableStatCard` itself (rendered
 * alongside it, not inside it) so that shared primitive stays untouched.
 */
export function PeriodDeltaBadge({ current, previous, direction, className }: PeriodDeltaBadgeProps) {
  if (previous === undefined) {
    return null;
  }

  const diff = current - previous;
  const percent = previous === 0 ? (current === 0 ? 0 : 100) : Math.round((diff / previous) * 100);
  const isFlat = diff === 0;
  const isUp = diff > 0;
  const isImprovement = direction === 'higher-is-better' ? isUp : !isUp;

  const icon = isFlat ? Minus : isUp ? ArrowUp : ArrowDown;
  const colorClass = isFlat ? 'text-text-tertiary' : isImprovement ? 'text-success-emphasis' : 'text-danger-emphasis';

  return (
    <span
      className={cn(
        'inline-flex items-center gap-0.5 rounded-full bg-surface px-1.5 py-0.5 text-xs font-medium shadow-sm',
        colorClass,
        className,
      )}
    >
      <Icon icon={icon} size="sm" />
      {`${isUp ? '+' : ''}${percent}%`}
    </span>
  );
}
