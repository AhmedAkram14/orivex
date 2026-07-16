import { z } from 'zod';

export function createScheduleExceptionSchema(t: (key: string) => string) {
  return z.object({
    date: z.string().min(1, t('dateRequired')),
    type: z.enum(['vacation', 'unavailable', 'extra-hours']),
    reason: z.string().optional(),
  });
}

export type ScheduleExceptionFormValues = z.infer<ReturnType<typeof createScheduleExceptionSchema>>;
