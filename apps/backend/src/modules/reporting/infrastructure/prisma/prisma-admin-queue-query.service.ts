import { Injectable } from '@nestjs/common';
import {
  DisputeStatus as PrismaDisputeStatus,
  ReviewModerationStatus as PrismaReviewModerationStatus,
  VerificationStatus as PrismaVerificationStatus,
} from '@prisma/client';

import { PrismaService } from '../../../../platform/database/prisma.service.js';
import type { AdminQueueQueryPort, WorkQueueSnapshot } from '../../application/ports/admin-queue-query.port.js';

// The admin verification queue's default statuses -- mirrors TrustModule's
// PrismaVerificationCaseRepository PENDING_REVIEW_STATUSES (not importable
// across the module boundary), so the Overview card counts exactly the rows
// GET /admin/verification-queue lists.
const VERIFICATION_QUEUE_STATUSES: PrismaVerificationStatus[] = [
  PrismaVerificationStatus.SUBMITTED,
  PrismaVerificationStatus.UNDER_REVIEW,
  PrismaVerificationStatus.MORE_INFO_NEEDED,
];

// Same read-model approach as the other reporting query services: one
// count + one min() per queue, straight against the owning tables, never a
// write-repo of another module.
@Injectable()
export class PrismaAdminQueueQueryService implements AdminQueueQueryPort {
  constructor(private readonly prisma: PrismaService) {}

  async getPendingVerifications(): Promise<WorkQueueSnapshot> {
    const result = await this.prisma.verificationCase.aggregate({
      where: { status: { in: VERIFICATION_QUEUE_STATUSES } },
      _count: { _all: true },
      _min: { submittedAt: true },
    });
    return { count: result._count._all, oldestWaitingSince: result._min.submittedAt ?? null };
  }

  async getOpenDisputes(): Promise<WorkQueueSnapshot> {
    const result = await this.prisma.dispute.aggregate({
      where: { status: PrismaDisputeStatus.OPEN },
      _count: { _all: true },
      _min: { createdAt: true },
    });
    return { count: result._count._all, oldestWaitingSince: result._min.createdAt ?? null };
  }

  async getFlaggedReviews(): Promise<WorkQueueSnapshot> {
    const count = await this.prisma.consultationFeedback.count({
      where: { moderationStatus: PrismaReviewModerationStatus.FLAGGED },
    });
    return { count, oldestWaitingSince: null };
  }
}
