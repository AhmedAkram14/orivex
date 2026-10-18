import type { AdminOverview, WorkQueueSnapshot } from '@/features/admin/api/types';

/**
 * When a waiting item turns late. The basis is the average verification
 * review time, which the Overview shows on the verification card so an
 * admin can see the pace this is measured against; revisit the constant if
 * that average settles well away from it. One threshold for every queue, so
 * "late" reads the same on each card.
 */
export const TRIAGE_LATE_AFTER_HOURS = 48;

export type TriageQueueKey = 'verifications' | 'disputes' | 'reviews';

export interface TriageItem {
  key: TriageQueueKey;
  href: string;
  count: number;
  /** null when the queue records no arrival time (flagged reviews). */
  oldestWaitingSince: string | null;
  /** Whole hours the oldest item has waited, or null when unknown. */
  waitingHours: number | null;
  late: boolean;
}

const QUEUES: Array<{ key: TriageQueueKey; href: string; pick: (overview: AdminOverview) => WorkQueueSnapshot }> = [
  { key: 'verifications', href: '/admin/verification-queue', pick: (overview) => overview.needsAttention.pendingVerifications },
  { key: 'disputes', href: '/admin/disputes', pick: (overview) => overview.needsAttention.openDisputes },
  { key: 'reviews', href: '/admin/reviews', pick: (overview) => overview.needsAttention.flaggedReviews },
];

/**
 * The "Needs attention" cards: only queues with something in them, the
 * longest-waiting first. A queue that records no arrival time can't be
 * ranked by age, so it follows the ones that can (by size, then a stable
 * order) rather than being guessed into place.
 */
export function buildTriageItems(overview: AdminOverview, now: Date = new Date()): TriageItem[] {
  const items = QUEUES.map(({ key, href, pick }) => {
    const { count, oldestWaitingSince } = pick(overview);
    const waitingHours =
      oldestWaitingSince === null ? null : Math.max(0, Math.floor((now.getTime() - new Date(oldestWaitingSince).getTime()) / 3_600_000));
    return { key, href, count, oldestWaitingSince, waitingHours, late: waitingHours !== null && waitingHours >= TRIAGE_LATE_AFTER_HOURS };
  }).filter((item) => item.count > 0);

  return items.sort((a, b) => {
    if (a.waitingHours !== null && b.waitingHours !== null) return b.waitingHours - a.waitingHours;
    if (a.waitingHours !== null) return -1;
    if (b.waitingHours !== null) return 1;
    return b.count - a.count;
  });
}

/** Below this a wait reads in hours ("30 hours"), from it in whole days ("3 days"). */
const SHOW_DAYS_FROM_HOURS = 48;

/** A waiting time as the cards say it. */
export function waitingAge(hours: number): { unit: 'hours' | 'days'; value: number } {
  return hours < SHOW_DAYS_FROM_HOURS ? { unit: 'hours', value: hours } : { unit: 'days', value: Math.floor(hours / 24) };
}
