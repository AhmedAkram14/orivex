import { ReviewModerationStatus as PrismaReviewModerationStatus } from '@prisma/client';
import type { ConsultationFeedback as PrismaConsultationFeedback } from '@prisma/client';

import { ConsultationFeedback } from '../../domain/entities/consultation-feedback.entity.js';
import { ReviewModerationStatus } from '../../domain/enums/review-moderation-status.enum.js';

// I11 -- Admin content moderation: Prisma's enum is UPPER (database
// convention); the domain enum is lower -- same translation-at-the-boundary
// pattern as audit-log.mapper.ts's own AuditAction map.
const DOMAIN_TO_PRISMA_MODERATION_STATUS: Record<ReviewModerationStatus, PrismaReviewModerationStatus> = {
  [ReviewModerationStatus.Visible]: PrismaReviewModerationStatus.VISIBLE,
  [ReviewModerationStatus.Flagged]: PrismaReviewModerationStatus.FLAGGED,
  [ReviewModerationStatus.Hidden]: PrismaReviewModerationStatus.HIDDEN,
};

const PRISMA_TO_DOMAIN_MODERATION_STATUS: Record<PrismaReviewModerationStatus, ReviewModerationStatus> = {
  [PrismaReviewModerationStatus.VISIBLE]: ReviewModerationStatus.Visible,
  [PrismaReviewModerationStatus.FLAGGED]: ReviewModerationStatus.Flagged,
  [PrismaReviewModerationStatus.HIDDEN]: ReviewModerationStatus.Hidden,
};

export function toPrismaModerationStatus(status: ReviewModerationStatus): PrismaReviewModerationStatus {
  return DOMAIN_TO_PRISMA_MODERATION_STATUS[status];
}

export function toDomainConsultationFeedback(row: PrismaConsultationFeedback): ConsultationFeedback {
  return ConsultationFeedback.reconstitute({
    id: row.id,
    consultationSessionId: row.consultationSessionId,
    patientId: row.patientId,
    doctorId: row.doctorId,
    rating: row.rating,
    comment: row.comment ?? undefined,
    communicationRating: row.communicationRating ?? undefined,
    punctualityRating: row.punctualityRating ?? undefined,
    thoroughnessRating: row.thoroughnessRating ?? undefined,
    createdAt: row.createdAt,
    moderationStatus: PRISMA_TO_DOMAIN_MODERATION_STATUS[row.moderationStatus],
    moderationReason: row.moderationReason ?? undefined,
    moderatedByAccountId: row.moderatedByAccountId ?? undefined,
    moderatedAt: row.moderatedAt ?? undefined,
  });
}
