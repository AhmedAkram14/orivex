import { LabRequestStatus as PrismaLabRequestStatus } from '@prisma/client';

import { LabRequestStatus } from '../../domain/enums/lab-request-status.enum.js';

// Prisma's enum is UPPER_SNAKE (database convention); the domain enum is
// lower_snake, matching this module's own PrescriptionStatus translation
// idiom exactly.
const DOMAIN_TO_PRISMA: Record<LabRequestStatus, PrismaLabRequestStatus> = {
  [LabRequestStatus.Ordered]: PrismaLabRequestStatus.ORDERED,
  [LabRequestStatus.Cancelled]: PrismaLabRequestStatus.CANCELLED,
};

const PRISMA_TO_DOMAIN: Record<PrismaLabRequestStatus, LabRequestStatus> = {
  [PrismaLabRequestStatus.ORDERED]: LabRequestStatus.Ordered,
  [PrismaLabRequestStatus.CANCELLED]: LabRequestStatus.Cancelled,
};

export function toPrismaLabRequestStatus(status: LabRequestStatus): PrismaLabRequestStatus {
  return DOMAIN_TO_PRISMA[status];
}

export function toDomainLabRequestStatus(status: PrismaLabRequestStatus): LabRequestStatus {
  return PRISMA_TO_DOMAIN[status];
}
