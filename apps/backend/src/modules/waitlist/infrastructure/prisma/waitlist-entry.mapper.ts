import {
  WaitlistEntryStatus as PrismaWaitlistEntryStatus,
  ConsultationType as PrismaConsultationType,
} from '@prisma/client';
import type { WaitlistEntry as PrismaWaitlistEntry } from '@prisma/client';

import { WaitlistEntry } from '../../domain/entities/waitlist-entry.entity.js';
import { WaitlistEntryStatus } from '../../domain/enums/waitlist-entry-status.enum.js';
import { ConsultationType } from '../../domain/enums/consultation-type.enum.js';

const DOMAIN_TO_PRISMA_STATUS: Record<WaitlistEntryStatus, PrismaWaitlistEntryStatus> = {
  [WaitlistEntryStatus.Waiting]: PrismaWaitlistEntryStatus.WAITING,
  [WaitlistEntryStatus.Notified]: PrismaWaitlistEntryStatus.NOTIFIED,
  [WaitlistEntryStatus.Fulfilled]: PrismaWaitlistEntryStatus.FULFILLED,
  [WaitlistEntryStatus.Cancelled]: PrismaWaitlistEntryStatus.CANCELLED,
};

const PRISMA_TO_DOMAIN_STATUS: Record<PrismaWaitlistEntryStatus, WaitlistEntryStatus> = {
  [PrismaWaitlistEntryStatus.WAITING]: WaitlistEntryStatus.Waiting,
  [PrismaWaitlistEntryStatus.NOTIFIED]: WaitlistEntryStatus.Notified,
  [PrismaWaitlistEntryStatus.FULFILLED]: WaitlistEntryStatus.Fulfilled,
  [PrismaWaitlistEntryStatus.CANCELLED]: WaitlistEntryStatus.Cancelled,
};

const DOMAIN_TO_PRISMA_CONSULTATION_TYPE: Record<ConsultationType, PrismaConsultationType> = {
  [ConsultationType.Free]: PrismaConsultationType.FREE,
  [ConsultationType.Paid]: PrismaConsultationType.PAID,
};

const PRISMA_TO_DOMAIN_CONSULTATION_TYPE: Record<PrismaConsultationType, ConsultationType> = {
  [PrismaConsultationType.FREE]: ConsultationType.Free,
  [PrismaConsultationType.PAID]: ConsultationType.Paid,
};

export function toPrismaWaitlistEntryStatus(status: WaitlistEntryStatus): PrismaWaitlistEntryStatus {
  return DOMAIN_TO_PRISMA_STATUS[status];
}

export function toPrismaConsultationType(type: ConsultationType | undefined): PrismaConsultationType | null {
  return type === undefined ? null : DOMAIN_TO_PRISMA_CONSULTATION_TYPE[type];
}

export function toDomainWaitlistEntry(row: PrismaWaitlistEntry): WaitlistEntry {
  return WaitlistEntry.reconstitute({
    id: row.id,
    patientId: row.patientId,
    doctorId: row.doctorId,
    consultationType: row.consultationType ? PRISMA_TO_DOMAIN_CONSULTATION_TYPE[row.consultationType] : undefined,
    earliestAcceptableAt: row.earliestAcceptableAt,
    latestAcceptableAt: row.latestAcceptableAt,
    status: PRISMA_TO_DOMAIN_STATUS[row.status],
    notifiedAt: row.notifiedAt ?? undefined,
    fulfilledAt: row.fulfilledAt ?? undefined,
    cancelledAt: row.cancelledAt ?? undefined,
    createdAt: row.createdAt,
  });
}
