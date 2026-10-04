'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useRef, useState, type HTMLAttributes, type ReactNode } from 'react';
import { isAwaitingOutcome } from '@/shared/lib/consultation/awaiting-outcome';
import { cn } from '@/shared/lib/cn';

/**
 * The one status vocabulary for every role: appointment, payment, dispute,
 * prescription, knowledge-article, verification and waitlist statuses all map
 * through `STATUS_TONE` below, so a status has identical colours wherever it
 * appears. Add a status here, never a per-feature colour map.
 */
export type StatusTone = 'warning' | 'info' | 'live' | 'success' | 'danger' | 'neutral';

const STATUS_TONE = {
  // Awaiting someone's action
  pending: 'warning',
  requested: 'warning',
  pending_review: 'warning',
  more_info_needed: 'warning',
  disputed: 'warning',
  suspended: 'warning',
  rescheduled: 'warning',
  // Scheduled / in motion
  scheduled: 'info',
  confirmed: 'info',
  initiated: 'info',
  processing: 'info',
  waiting: 'info',
  notified: 'info',
  upcoming: 'info',
  // Happening now: pulse fill, ink text, live dot
  in_consultation: 'live',
  'in-consultation': 'live',
  in_progress: 'live',
  'in-progress': 'live',
  live: 'live',
  // Done well
  completed: 'success',
  paid: 'success',
  succeeded: 'success',
  settled: 'success',
  fulfilled: 'success',
  published: 'success',
  approved: 'success',
  active: 'success',
  // Did not happen / failed
  cancelled: 'danger',
  no_show: 'danger',
  failed: 'danger',
  rejected: 'danger',
  // Schedule slots
  available: 'success',
  booked: 'info',
  blocked: 'neutral',
  past: 'neutral',
  // Disputes
  open: 'warning',
  resolved: 'success',
  dismissed: 'neutral',
  withdrawn: 'neutral',
  // Quiet / closed
  expired: 'neutral',
  refunded: 'neutral',
  awaiting_outcome: 'neutral',
  draft: 'neutral',
  archived: 'neutral',
  closed: 'neutral',
} as const satisfies Record<string, StatusTone>;

export type StatusKey = keyof typeof STATUS_TONE;

const TONE_CLASS: Record<StatusTone, string> = {
  warning: 'bg-warning-subtle text-warning-emphasis',
  info: 'bg-info-subtle text-info-emphasis',
  live: 'bg-pulse text-pulse-foreground',
  success: 'bg-success-subtle text-success-emphasis',
  danger: 'bg-danger-subtle text-danger-emphasis',
  neutral: 'bg-neutral-subtle text-text-secondary',
};

const DOT_CLASS: Record<StatusTone, string> = {
  warning: 'bg-warning',
  info: 'bg-info',
  live: 'bg-pulse-foreground animate-pulse-live',
  success: 'bg-success',
  danger: 'bg-danger',
  neutral: 'bg-text-tertiary',
};

export interface StatusBadgeProps extends Omit<HTMLAttributes<HTMLSpanElement>, 'children'> {
  status: StatusKey;
  /**
   * Fallback text for a status with no shared label. Every status in the shared vocabulary always
   * reads from i18n `ds.status.<status>`, so one status has ONE label everywhere ("Awaiting approval",
   * never a per-feature variant) -- a caller's label is ignored for those.
   */
  label?: ReactNode;
  /** Shows the 6px dot. Always on for `live` statuses. */
  dot?: boolean;
  /**
   * Time-aware appointment status: a `confirmed` appointment whose slot (and join
   * window) is over renders the neutral "Awaiting outcome" instead. The caller
   * also uses `isAwaitingOutcome` to hide patient-side Cancel.
   */
  timeAware?: { scheduledAt: string; endTime?: string };
}

/** The tone a status resolves to -- exported so a table row or chart can colour a non-badge element consistently. */
export function statusTone(status: StatusKey): StatusTone {
  return STATUS_TONE[status];
}

export function StatusBadge({ status, label, dot = false, timeAware, className, ...props }: StatusBadgeProps) {
  const t = useTranslations('ds.status');
  const effective: StatusKey =
    timeAware && status === 'confirmed' && isAwaitingOutcome({ status, ...timeAware }) ? 'awaiting_outcome' : status;
  const tone = STATUS_TONE[effective];
  const text = t.has(effective) ? t(effective) : (label ?? effective);

  // A one-shot soft ring when the status *changes* (not on first mount).
  const previous = useRef(effective);
  const [pulsing, setPulsing] = useState(false);
  useEffect(() => {
    if (previous.current !== effective) {
      previous.current = effective;
      setPulsing(true);
      const timer = window.setTimeout(() => setPulsing(false), 720);
      return () => window.clearTimeout(timer);
    }
  }, [effective]);

  return (
    <span
      data-status={effective}
      className={cn(
        'inline-flex h-5.5 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 text-caption font-semibold tracking-normal transition-colors duration-(--duration-base)',
        TONE_CLASS[tone],
        pulsing && 'animate-ring-once',
        className,
      )}
      {...props}
    >
      {(dot || tone === 'live') && <span aria-hidden="true" className={cn('size-1.5 rounded-full', DOT_CLASS[tone])} />}
      {text}
    </span>
  );
}
