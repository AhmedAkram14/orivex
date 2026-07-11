import { ConsultationType as PrismaConsultationType } from '@prisma/client';

import { ConsultationType } from '../../domain/enums/consultation-type.enum.js';

// Reuses the same Prisma-level ConsultationType enum as DoctorModule's
// AvailabilityWindow (no duplicate Prisma enum -- architect direction).
// The domain-layer enum is still this module's own copy (domain layers
// never import across module boundaries).
const DOMAIN_TO_PRISMA: Record<ConsultationType, PrismaConsultationType> = {
  [ConsultationType.Free]: PrismaConsultationType.FREE,
  [ConsultationType.Paid]: PrismaConsultationType.PAID,
};

const PRISMA_TO_DOMAIN: Record<PrismaConsultationType, ConsultationType> = {
  [PrismaConsultationType.FREE]: ConsultationType.Free,
  [PrismaConsultationType.PAID]: ConsultationType.Paid,
};

export function toPrismaConsultationType(value: ConsultationType): PrismaConsultationType {
  return DOMAIN_TO_PRISMA[value];
}

export function toDomainConsultationType(value: PrismaConsultationType): ConsultationType {
  return PRISMA_TO_DOMAIN[value];
}
