import { WeekDay as PrismaWeekDay } from '@prisma/client';

import { WeekDay } from '../../domain/enums/week-day.enum.js';

// Prisma's enum is UPPER_SNAKE (database convention); the domain enum is
// lowercase, matching the frontend's real WeekDay contract exactly. Same
// translation-boundary pattern as notification-severity.mapper.ts.
const DOMAIN_TO_PRISMA: Record<WeekDay, PrismaWeekDay> = {
  [WeekDay.Sunday]: PrismaWeekDay.SUNDAY,
  [WeekDay.Monday]: PrismaWeekDay.MONDAY,
  [WeekDay.Tuesday]: PrismaWeekDay.TUESDAY,
  [WeekDay.Wednesday]: PrismaWeekDay.WEDNESDAY,
  [WeekDay.Thursday]: PrismaWeekDay.THURSDAY,
  [WeekDay.Friday]: PrismaWeekDay.FRIDAY,
  [WeekDay.Saturday]: PrismaWeekDay.SATURDAY,
};

const PRISMA_TO_DOMAIN: Record<PrismaWeekDay, WeekDay> = {
  [PrismaWeekDay.SUNDAY]: WeekDay.Sunday,
  [PrismaWeekDay.MONDAY]: WeekDay.Monday,
  [PrismaWeekDay.TUESDAY]: WeekDay.Tuesday,
  [PrismaWeekDay.WEDNESDAY]: WeekDay.Wednesday,
  [PrismaWeekDay.THURSDAY]: WeekDay.Thursday,
  [PrismaWeekDay.FRIDAY]: WeekDay.Friday,
  [PrismaWeekDay.SATURDAY]: WeekDay.Saturday,
};

export function toPrismaWeekDay(value: WeekDay): PrismaWeekDay {
  return DOMAIN_TO_PRISMA[value];
}

export function toDomainWeekDay(value: PrismaWeekDay): WeekDay {
  return PRISMA_TO_DOMAIN[value];
}
