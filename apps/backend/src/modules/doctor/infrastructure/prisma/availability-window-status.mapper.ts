import { AvailabilityWindowStatus as PrismaAvailabilityWindowStatus } from '@prisma/client';

import { AvailabilityWindowStatus } from '../../domain/enums/availability-window-status.enum.js';

// Prisma's enum is UPPER_SNAKE (database convention); the domain enum is
// lower_snake. This is the sole place the two vocabularies are translated.
const DOMAIN_TO_PRISMA: Record<AvailabilityWindowStatus, PrismaAvailabilityWindowStatus> = {
  [AvailabilityWindowStatus.Open]: PrismaAvailabilityWindowStatus.OPEN,
  [AvailabilityWindowStatus.Held]: PrismaAvailabilityWindowStatus.HELD,
  [AvailabilityWindowStatus.Booked]: PrismaAvailabilityWindowStatus.BOOKED,
};

const PRISMA_TO_DOMAIN: Record<PrismaAvailabilityWindowStatus, AvailabilityWindowStatus> = {
  [PrismaAvailabilityWindowStatus.OPEN]: AvailabilityWindowStatus.Open,
  [PrismaAvailabilityWindowStatus.HELD]: AvailabilityWindowStatus.Held,
  [PrismaAvailabilityWindowStatus.BOOKED]: AvailabilityWindowStatus.Booked,
};

export function toPrismaAvailabilityWindowStatus(status: AvailabilityWindowStatus): PrismaAvailabilityWindowStatus {
  return DOMAIN_TO_PRISMA[status];
}

export function toDomainAvailabilityWindowStatus(status: PrismaAvailabilityWindowStatus): AvailabilityWindowStatus {
  return PRISMA_TO_DOMAIN[status];
}
