import { describe, expect, it } from 'vitest';
import type { AdminOverview } from '@/features/admin/api/types';
import { buildTriageItems, TRIAGE_LATE_AFTER_HOURS, waitingAge } from '@/features/admin/lib/triage';

const NOW = new Date('2026-10-18T12:00:00.000Z');
const hoursAgo = (hours: number) => new Date(NOW.getTime() - hours * 3_600_000).toISOString();

function overview(needsAttention: Partial<AdminOverview['needsAttention']>): AdminOverview {
  const empty = { count: 0, oldestWaitingSince: null };
  return {
    generatedAt: NOW.toISOString(),
    needsAttention: { pendingVerifications: empty, openDisputes: empty, flaggedReviews: empty, ...needsAttention },
    averageVerificationReviewHours: null,
    health: {
      appointmentsToday: 0,
      appointmentsLast7Days: 0,
      completionRate: 0,
      cancellationRate: 0,
      noShowRate: 0,
      revenueToday: 0,
      revenueChangePercent: null,
      failedPayments: 0,
      activeDoctors: 0,
      activePatients: 0,
      activeWindowDays: 30,
    },
  };
}

describe('buildTriageItems', () => {
  it('returns nothing when every queue is empty', () => {
    expect(buildTriageItems(overview({}), NOW)).toEqual([]);
  });

  it('shows only queues with something in them', () => {
    const items = buildTriageItems(overview({ openDisputes: { count: 2, oldestWaitingSince: hoursAgo(5) } }), NOW);
    expect(items.map((item) => item.key)).toEqual(['disputes']);
    expect(items[0]).toMatchObject({ href: '/admin/disputes', count: 2, waitingHours: 5, late: false });
  });

  it('puts the longest-waiting queue first, and a queue with no recorded arrival time after every aged one', () => {
    const items = buildTriageItems(
      overview({
        pendingVerifications: { count: 1, oldestWaitingSince: hoursAgo(10) },
        openDisputes: { count: 4, oldestWaitingSince: hoursAgo(80) },
        flaggedReviews: { count: 9, oldestWaitingSince: null },
      }),
      NOW,
    );
    expect(items.map((item) => item.key)).toEqual(['disputes', 'verifications', 'reviews']);
    expect(items[2]).toMatchObject({ waitingHours: null, late: false });
  });

  it('marks a queue late from the threshold on, never before it', () => {
    const justBefore = buildTriageItems(overview({ openDisputes: { count: 1, oldestWaitingSince: hoursAgo(TRIAGE_LATE_AFTER_HOURS - 1) } }), NOW);
    const atThreshold = buildTriageItems(overview({ openDisputes: { count: 1, oldestWaitingSince: hoursAgo(TRIAGE_LATE_AFTER_HOURS) } }), NOW);
    expect(justBefore[0]?.late).toBe(false);
    expect(atThreshold[0]?.late).toBe(true);
  });

  it('never reports a negative wait when the server clock is a little ahead', () => {
    const items = buildTriageItems(overview({ openDisputes: { count: 1, oldestWaitingSince: hoursAgo(-1) } }), NOW);
    expect(items[0]?.waitingHours).toBe(0);
  });
});

describe('waitingAge', () => {
  it('reads in hours below two days and in whole days from there', () => {
    expect(waitingAge(0)).toEqual({ unit: 'hours', value: 0 });
    expect(waitingAge(47)).toEqual({ unit: 'hours', value: 47 });
    expect(waitingAge(48)).toEqual({ unit: 'days', value: 2 });
    expect(waitingAge(80)).toEqual({ unit: 'days', value: 3 });
  });
});
