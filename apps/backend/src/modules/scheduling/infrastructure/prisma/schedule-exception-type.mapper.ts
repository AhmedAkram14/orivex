import { ScheduleExceptionType as PrismaScheduleExceptionType } from '@prisma/client';

import { ScheduleExceptionType } from '../../domain/enums/schedule-exception-type.enum.js';

// Prisma's enum is UPPER_SNAKE; the domain enum matches the frontend's real
// ScheduleExceptionType contract exactly ('vacation' | 'unavailable' |
// 'extra-hours').
const DOMAIN_TO_PRISMA: Record<ScheduleExceptionType, PrismaScheduleExceptionType> = {
  [ScheduleExceptionType.Vacation]: PrismaScheduleExceptionType.VACATION,
  [ScheduleExceptionType.Unavailable]: PrismaScheduleExceptionType.UNAVAILABLE,
  [ScheduleExceptionType.ExtraHours]: PrismaScheduleExceptionType.EXTRA_HOURS,
};

const PRISMA_TO_DOMAIN: Record<PrismaScheduleExceptionType, ScheduleExceptionType> = {
  [PrismaScheduleExceptionType.VACATION]: ScheduleExceptionType.Vacation,
  [PrismaScheduleExceptionType.UNAVAILABLE]: ScheduleExceptionType.Unavailable,
  [PrismaScheduleExceptionType.EXTRA_HOURS]: ScheduleExceptionType.ExtraHours,
};

export function toPrismaScheduleExceptionType(value: ScheduleExceptionType): PrismaScheduleExceptionType {
  return DOMAIN_TO_PRISMA[value];
}

export function toDomainScheduleExceptionType(value: PrismaScheduleExceptionType): ScheduleExceptionType {
  return PRISMA_TO_DOMAIN[value];
}
