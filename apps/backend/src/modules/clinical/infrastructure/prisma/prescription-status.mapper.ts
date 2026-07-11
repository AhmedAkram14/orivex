import { PrescriptionStatus as PrismaPrescriptionStatus } from '@prisma/client';

import { PrescriptionStatus } from '../../domain/enums/prescription-status.enum.js';

// Prisma's enum is UPPER_SNAKE (database convention); the domain enum is
// lower_snake, matching docs/12-openapi.md's PrescriptionSummary.status
// exactly. This is the sole place the two vocabularies are translated.
const DOMAIN_TO_PRISMA: Record<PrescriptionStatus, PrismaPrescriptionStatus> = {
  [PrescriptionStatus.Draft]: PrismaPrescriptionStatus.DRAFT,
  [PrescriptionStatus.Signed]: PrismaPrescriptionStatus.SIGNED,
  [PrescriptionStatus.Active]: PrismaPrescriptionStatus.ACTIVE,
  [PrescriptionStatus.Expired]: PrismaPrescriptionStatus.EXPIRED,
  [PrescriptionStatus.Superseded]: PrismaPrescriptionStatus.SUPERSEDED,
};

const PRISMA_TO_DOMAIN: Record<PrismaPrescriptionStatus, PrescriptionStatus> = {
  [PrismaPrescriptionStatus.DRAFT]: PrescriptionStatus.Draft,
  [PrismaPrescriptionStatus.SIGNED]: PrescriptionStatus.Signed,
  [PrismaPrescriptionStatus.ACTIVE]: PrescriptionStatus.Active,
  [PrismaPrescriptionStatus.EXPIRED]: PrescriptionStatus.Expired,
  [PrismaPrescriptionStatus.SUPERSEDED]: PrescriptionStatus.Superseded,
};

export function toPrismaPrescriptionStatus(status: PrescriptionStatus): PrismaPrescriptionStatus {
  return DOMAIN_TO_PRISMA[status];
}

export function toDomainPrescriptionStatus(status: PrismaPrescriptionStatus): PrescriptionStatus {
  return PRISMA_TO_DOMAIN[status];
}
