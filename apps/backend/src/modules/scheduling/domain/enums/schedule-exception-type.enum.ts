// Matches the frontend's ScheduleExceptionType union exactly (apps/frontend/
// src/features/scheduling/types.ts): 'vacation' | 'unavailable' | 'extra-hours'.
export const ScheduleExceptionType = {
  Vacation: 'vacation',
  Unavailable: 'unavailable',
  ExtraHours: 'extra-hours',
} as const;

export type ScheduleExceptionType = (typeof ScheduleExceptionType)[keyof typeof ScheduleExceptionType];
