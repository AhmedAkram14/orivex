import { z } from 'zod';

type Translate = (key: string, values?: Record<string, string | number | Date>) => string;

/**
 * Phase 3 (Prescribing & Allergy Safety UX): the Compose step's validation
 * for the patient chart's "Write prescription" flow. Structural validation
 * only (required/format), matching this codebase's Zod-layer boundary
 * (`shared/ui/form.tsx`'s own doc comment) -- the real business rule (a real
 * diagnosisNodeId already recorded against an InProgress-or-Completed
 * session) is enforced server-side by `SignPrescriptionUseCase`, not
 * replicated here.
 *
 * One `Prescription` already supports multiple `PrescriptionLineItemDto`
 * entries server-side (Phase 0 finding (d)) -- `lineItems` is a real array
 * so "Add another medication" produces one prescription with N real line
 * items, never N separate sign calls.
 */
export function createPrescriptionLineItemSchema(t: Translate) {
  return z.object({
    drugName: z.string().trim().min(1, t('drugNameRequired')),
    dosage: z.string().trim().min(1, t('dosageRequired')),
    frequency: z.string().trim().min(1, t('frequencyRequired')),
    // Kept as a string in the form (native number inputs emit strings) and
    // coerced here; empty string must fail validation, not coerce to 0.
    durationDays: z
      .string()
      .trim()
      .min(1, t('durationRequired'))
      .refine((value) => Number.isInteger(Number(value)) && Number(value) > 0, t('durationInvalid')),
    instructions: z.string().trim().optional(),
  });
}

export function createWritePrescriptionSchema(t: Translate) {
  return z.object({
    diagnosisNodeId: z.string().min(1, t('diagnosisRequired')),
    lineItems: z.array(createPrescriptionLineItemSchema(t)).min(1),
  });
}

export type WritePrescriptionFormValues = z.infer<ReturnType<typeof createWritePrescriptionSchema>>;
export type PrescriptionLineItemFormValues = z.infer<ReturnType<typeof createPrescriptionLineItemSchema>>;

export const EMPTY_PRESCRIPTION_LINE_ITEM: PrescriptionLineItemFormValues = {
  drugName: '',
  dosage: '',
  frequency: '',
  durationDays: '',
  instructions: '',
};
