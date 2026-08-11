import { z } from 'zod';
import { isTimeWithinRange, rangesOverlap } from '@/features/scheduling/utils/time';

const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;

export function createWorkingHoursSchema(t: (key: string, values?: Record<string, string | number>) => string) {
  const timeOfDay = z.string().regex(TIME_PATTERN, t('invalidTime'));
  const timeRange = z.object({ start: timeOfDay, end: timeOfDay });

  const pricing = z.object({
    pricingType: z.enum(['free', 'paid']),
    feeAmount: z.number().nullable().optional(),
    feeCurrency: z.string().nullable().optional(),
  });

  const day = z
    .object({
      dayOfWeek: z.enum(['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']),
      isWorkingDay: z.boolean(),
      hours: timeRange,
      breaks: z.array(timeRange).max(5, t('tooManyBreaks', { max: 5 })),
      pricing,
    })
    .superRefine((value, ctx) => {
      if (value.pricing.pricingType === 'paid' && !(typeof value.pricing.feeAmount === 'number' && value.pricing.feeAmount > 0)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: t('feeAmountRequired'), path: ['pricing', 'feeAmount'] });
      }

      if (!value.isWorkingDay) return;

      if (value.hours.start >= value.hours.end) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: t('endAfterStart'), path: ['hours', 'end'] });
      }

      value.breaks.forEach((brk, index) => {
        if (brk.start >= brk.end) {
          ctx.addIssue({ code: z.ZodIssueCode.custom, message: t('endAfterStart'), path: ['breaks', index, 'end'] });
          return;
        }
        if (!isTimeWithinRange(brk.start, value.hours) || brk.end > value.hours.end) {
          ctx.addIssue({ code: z.ZodIssueCode.custom, message: t('breakOutsideHours'), path: ['breaks', index, 'start'] });
        }
        const overlapsAnother = value.breaks.some((other, otherIndex) => otherIndex !== index && rangesOverlap(brk, other));
        if (overlapsAnother) {
          ctx.addIssue({ code: z.ZodIssueCode.custom, message: t('breaksOverlap'), path: ['breaks', index, 'start'] });
        }
      });
    });

  return z.object({ days: z.array(day).length(7) });
}

export type WorkingHoursFormValues = z.infer<ReturnType<typeof createWorkingHoursSchema>>;
