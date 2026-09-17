import { DisputeStatus as PrismaDisputeStatus, DisputeCategory as PrismaDisputeCategory } from '@prisma/client';
import type { Dispute as PrismaDispute } from '@prisma/client';

import { Dispute } from '../../domain/entities/dispute.entity.js';
import { DisputeStatus } from '../../domain/enums/dispute-status.enum.js';
import { DisputeCategory } from '../../domain/enums/dispute-category.enum.js';

const DOMAIN_TO_PRISMA_STATUS: Record<DisputeStatus, PrismaDisputeStatus> = {
  [DisputeStatus.Open]: PrismaDisputeStatus.OPEN,
  [DisputeStatus.Resolved]: PrismaDisputeStatus.RESOLVED,
  [DisputeStatus.Dismissed]: PrismaDisputeStatus.DISMISSED,
  [DisputeStatus.Withdrawn]: PrismaDisputeStatus.WITHDRAWN,
};

const PRISMA_TO_DOMAIN_STATUS: Record<PrismaDisputeStatus, DisputeStatus> = {
  [PrismaDisputeStatus.OPEN]: DisputeStatus.Open,
  [PrismaDisputeStatus.RESOLVED]: DisputeStatus.Resolved,
  [PrismaDisputeStatus.DISMISSED]: DisputeStatus.Dismissed,
  [PrismaDisputeStatus.WITHDRAWN]: DisputeStatus.Withdrawn,
};

const DOMAIN_TO_PRISMA_CATEGORY: Record<DisputeCategory, PrismaDisputeCategory> = {
  [DisputeCategory.NoShow]: PrismaDisputeCategory.NO_SHOW,
  [DisputeCategory.PaymentRefund]: PrismaDisputeCategory.PAYMENT_REFUND,
  [DisputeCategory.Conduct]: PrismaDisputeCategory.CONDUCT,
  [DisputeCategory.TechnicalIssue]: PrismaDisputeCategory.TECHNICAL_ISSUE,
  [DisputeCategory.Other]: PrismaDisputeCategory.OTHER,
};

const PRISMA_TO_DOMAIN_CATEGORY: Record<PrismaDisputeCategory, DisputeCategory> = {
  [PrismaDisputeCategory.NO_SHOW]: DisputeCategory.NoShow,
  [PrismaDisputeCategory.PAYMENT_REFUND]: DisputeCategory.PaymentRefund,
  [PrismaDisputeCategory.CONDUCT]: DisputeCategory.Conduct,
  [PrismaDisputeCategory.TECHNICAL_ISSUE]: DisputeCategory.TechnicalIssue,
  [PrismaDisputeCategory.OTHER]: DisputeCategory.Other,
};

export function toPrismaDisputeStatus(status: DisputeStatus): PrismaDisputeStatus {
  return DOMAIN_TO_PRISMA_STATUS[status];
}

export function toPrismaDisputeCategory(category: DisputeCategory): PrismaDisputeCategory {
  return DOMAIN_TO_PRISMA_CATEGORY[category];
}

export function toDomainDisputeCategory(category: PrismaDisputeCategory): DisputeCategory {
  return PRISMA_TO_DOMAIN_CATEGORY[category];
}

export function toDomainDispute(row: PrismaDispute): Dispute {
  return Dispute.reconstitute({
    id: row.id,
    appointmentId: row.appointmentId,
    raisedByAccountId: row.raisedByAccountId,
    reason: row.reason,
    status: PRISMA_TO_DOMAIN_STATUS[row.status],
    category: row.category ? toDomainDisputeCategory(row.category) : undefined,
    attachmentAssetId: row.attachmentAssetId ?? undefined,
    resolutionNotes: row.resolutionNotes ?? undefined,
    resolvedByAccountId: row.resolvedByAccountId ?? undefined,
    resolvedAt: row.resolvedAt ?? undefined,
    createdAt: row.createdAt,
  });
}
