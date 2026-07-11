import { ConsultationType as PrismaConsultationType } from '@prisma/client';

import { ConsultationType } from '../../domain/enums/consultation-type.enum.js';

// Prisma's enum is UPPER_SNAKE (database convention); the domain enum is
// lower_snake, matching docs/12-openapi.md's consultationType exactly. This
// is the sole place the two vocabularies are translated.
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
