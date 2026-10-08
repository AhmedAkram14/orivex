import { z } from 'zod';
import { isRealIsoDate } from '@/shared/lib/date/iso-date';

export function createScheduleExceptionSchema(t: (key: string) => string) {
  return z.object({
    // A partly-picked date (the Day / Month / Year field) is not a date yet: same message as an empty one.
    date: z.string().min(1, t('dateRequired')).refine(isRealIsoDate, t('dateRequired')),
    type: z.enum(['vacation', 'unavailable', 'extra-hours']),
    reason: z.string().optional(),
  });
}

export type ScheduleExceptionFormValues = z.infer<ReturnType<typeof createScheduleExceptionSchema>>;
