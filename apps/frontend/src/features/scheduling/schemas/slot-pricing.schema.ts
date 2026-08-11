import { z } from 'zod';

/** The per-slot pricing override form (`PATCH /scheduling/upcoming-slots/:id/pricing`) — same Free/Paid + fee/currency shape as a working-hours day's default pricing, but standalone (no `days` wrapper). */
export function createSlotPricingSchema(t: (key: string, values?: Record<string, string | number>) => string) {
  return z
    .object({
      pricingType: z.enum(['free', 'paid']),
      feeAmount: z.number().nullable().optional(),
      feeCurrency: z.string().nullable().optional(),
    })
    .superRefine((value, ctx) => {
      if (value.pricingType === 'paid' && !(typeof value.feeAmount === 'number' && value.feeAmount > 0)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: t('feeAmountRequired'), path: ['feeAmount'] });
      }
    });
}

export type SlotPricingFormValues = z.infer<ReturnType<typeof createSlotPricingSchema>>;
