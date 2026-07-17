// Lowercase string values matching the frontend's WeekDay union exactly
// (apps/frontend/src/features/scheduling/types.ts) -- this module's wire/
// domain representation of a weekday is deliberately the same casing the
// frontend already uses, not the Prisma schema's upper-case WeekDay enum
// (mapped at the infrastructure boundary, see week-day.mapper.ts).
export const WeekDay = {
  Sunday: 'sunday',
  Monday: 'monday',
  Tuesday: 'tuesday',
  Wednesday: 'wednesday',
  Thursday: 'thursday',
  Friday: 'friday',
  Saturday: 'saturday',
} as const;

export type WeekDay = (typeof WeekDay)[keyof typeof WeekDay];

export const ALL_WEEK_DAYS: readonly WeekDay[] = [
  WeekDay.Sunday,
  WeekDay.Monday,
  WeekDay.Tuesday,
  WeekDay.Wednesday,
  WeekDay.Thursday,
  WeekDay.Friday,
  WeekDay.Saturday,
];
