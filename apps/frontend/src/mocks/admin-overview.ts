import type { AdminOverview, WorkQueueSnapshot } from '@/features/admin/api/types';
import { getVerificationQueue } from '@/mocks/admin-store';
import { listConsultationFeedbackByModerationStatus } from '@/mocks/consultation-store';
import { listDisputesByStatus } from '@/mocks/disputes-store';

function snapshot(arrivals: string[]): WorkQueueSnapshot {
  const oldest = arrivals.length === 0 ? null : arrivals.reduce((min, at) => (at < min ? at : min));
  return { count: arrivals.length, oldestWaitingSince: oldest };
}

/**
 * `GET /admin/overview` in the mock API: the work queues come from the same
 * in-memory stores the queue pages read, so a decision taken in a mocked
 * queue moves the Overview the way the real backend does. The health strip
 * has no mocked analytics source, so it reports zeros rather than invented
 * figures.
 */
export function getAdminOverview(): AdminOverview {
  return {
    generatedAt: new Date().toISOString(),
    needsAttention: {
      pendingVerifications: snapshot(getVerificationQueue({}).map((verificationCase) => verificationCase.submittedAt)),
      openDisputes: snapshot(listDisputesByStatus('open').map((dispute) => dispute.createdAt)),
      flaggedReviews: { count: listConsultationFeedbackByModerationStatus('flagged').length, oldestWaitingSince: null },
    },
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
