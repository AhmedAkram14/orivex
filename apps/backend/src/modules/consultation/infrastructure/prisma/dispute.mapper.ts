import { DisputeStatus as PrismaDisputeStatus } from '@prisma/client';
import type { Dispute as PrismaDispute } from '@prisma/client';

import { Dispute } from '../../domain/entities/dispute.entity.js';
import { DisputeStatus } from '../../domain/enums/dispute-status.enum.js';

const DOMAIN_TO_PRISMA_STATUS: Record<DisputeStatus, PrismaDisputeStatus> = {
  [DisputeStatus.Open]: PrismaDisputeStatus.OPEN,
  [DisputeStatus.Resolved]: PrismaDisputeStatus.RESOLVED,
  [DisputeStatus.Dismissed]: PrismaDisputeStatus.DISMISSED,
};

const PRISMA_TO_DOMAIN_STATUS: Record<PrismaDisputeStatus, DisputeStatus> = {
  [PrismaDisputeStatus.OPEN]: DisputeStatus.Open,
  [PrismaDisputeStatus.RESOLVED]: DisputeStatus.Resolved,
  [PrismaDisputeStatus.DISMISSED]: DisputeStatus.Dismissed,
};

export function toPrismaDisputeStatus(status: DisputeStatus): PrismaDisputeStatus {
  return DOMAIN_TO_PRISMA_STATUS[status];
}

export function toDomainDispute(row: PrismaDispute): Dispute {
  return Dispute.reconstitute({
    id: row.id,
    appointmentId: row.appointmentId,
    raisedByAccountId: row.raisedByAccountId,
    reason: row.reason,
    status: PRISMA_TO_DOMAIN_STATUS[row.status],
    resolutionNotes: row.resolutionNotes ?? undefined,
    resolvedByAccountId: row.resolvedByAccountId ?? undefined,
    resolvedAt: row.resolvedAt ?? undefined,
    createdAt: row.createdAt,
  });
}
